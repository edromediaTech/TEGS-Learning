const express = require('express');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');
const ExcelJS = require('exceljs');
const QuizResult = require('../models/QuizResult');
const Module = require('../models/Module');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');
const { requireFeature } = require('../middleware/featureGate');

const router = express.Router();

// -----------------------------------------------------------------------
// POST /api/reporting/submit-public
// Soumission publique via shareToken (pas d'auth requise)
// Utilisé par la page de partage pour enregistrer les résultats
// -----------------------------------------------------------------------
router.post('/submit-public', async (req, res, next) => {
  try {
    const { shareToken, studentName, studentEmail, answers, duration } = req.body;
    if (!shareToken || !studentName || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'shareToken, studentName et answers[] sont requis' });
    }

    const mod = await Module.findOne({ shareToken, shareEnabled: true });
    if (!mod) return res.status(404).json({ error: 'Module introuvable ou partage desactive' });

    // Live mode: allow a 60-second grace period after endTime for network latency
    if (mod.evaluationType === 'live' && mod.liveEndTime) {
      const graceMs = 60 * 1000; // 60 seconds grace
      if (new Date() > new Date(new Date(mod.liveEndTime).getTime() + graceMs)) {
        return res.status(403).json({ error: 'Soumission refusee : l\'examen est termine' });
      }
    }

    // Compute scores
    let totalScore = 0;
    let maxScore = 0;
    const numberedAnswers = answers.map((a, i) => {
      const pts = Number(a.pointsEarned) || 0;
      const max = Number(a.maxPoints) || 0;
      totalScore += pts;
      maxScore += max;
      return {
        blockId: a.blockId || `q${i}`,
        questionNumber: i + 1,
        questionType: a.questionType || 'quiz',
        questionText: a.questionText || '',
        choices: a.choices || null,
        studentAnswer: a.studentAnswer,
        correctAnswer: a.correctAnswer,
        isCorrect: !!a.isCorrect,
        pointsEarned: pts,
        maxPoints: max,
        feedback: a.feedback || '',
      };
    });

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    // Generate a pseudo user_id from the studentName for public submissions
    const mongoose = require('mongoose');
    const nameHash = studentName.toLowerCase().replace(/\s+/g, '_') + '_' + (studentEmail || 'anon');
    const pseudoUserId = new mongoose.Types.ObjectId();

    const result = await QuizResult.findOneAndUpdate(
      { module_id: mod._id, studentEmail: studentEmail || nameHash, tenant_id: mod.tenant_id },
      {
        user_id: pseudoUserId,
        studentName,
        studentEmail: studentEmail || '',
        moduleTitle: mod.title,
        totalScore,
        maxScore,
        percentage,
        duration: duration || '',
        completedAt: new Date(),
        answers: numberedAnswers,
        evaluationType: mod.evaluationType || 'personalized',
        autoSubmitted: !!req.body.autoSubmitted,
        ai_commentary: '',
        remediation: { generated: false, generatedAt: null, quiz: null },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({
      message: 'Resultats enregistres',
      score: `${totalScore}/${maxScore}`,
      percentage,
      resultId: result._id,
    });
  } catch (err) {
    next(err);
  }
});

// --- Authenticated routes below ---

// Support ?token= query param for browser download links (PDF/Excel)
router.use((req, _res, next) => {
  if (req.query.token && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
});

router.use(authenticate);
router.use(tenantIsolation);

// -----------------------------------------------------------------------
// POST /api/reporting/submit
// Soumettre les résultats détaillés d'un quiz (par le runtime/player)
// -----------------------------------------------------------------------
router.post('/submit', async (req, res, next) => {
  try {
    const { module_id, answers, duration } = req.body;
    if (!module_id || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'module_id et answers[] sont requis' });
    }

    const mod = await Module.findOne({ _id: module_id, ...req.tenantFilter() }).lean();
    if (!mod) return res.status(404).json({ error: 'Module introuvable' });

    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    // Compute scores
    let totalScore = 0;
    let maxScore = 0;
    const numberedAnswers = answers.map((a, i) => {
      const pts = Number(a.pointsEarned) || 0;
      const max = Number(a.maxPoints) || 0;
      totalScore += pts;
      maxScore += max;
      return {
        blockId: a.blockId || `q${i}`,
        questionNumber: i + 1,
        questionType: a.questionType || 'quiz',
        questionText: a.questionText || '',
        choices: a.choices || null,
        studentAnswer: a.studentAnswer,
        correctAnswer: a.correctAnswer,
        isCorrect: !!a.isCorrect,
        pointsEarned: pts,
        maxPoints: max,
        feedback: a.feedback || '',
      };
    });

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    // Upsert (one result per module+user)
    const result = await QuizResult.findOneAndUpdate(
      { module_id, user_id: req.user.id, tenant_id: req.tenantId },
      {
        studentName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        studentEmail: user.email || '',
        moduleTitle: mod.title,
        totalScore,
        maxScore,
        percentage,
        duration: duration || '',
        completedAt: new Date(),
        answers: numberedAnswers,
        // Reset AI fields on new submission
        ai_commentary: '',
        remediation: { generated: false, generatedAt: null, quiz: null },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ message: 'Résultats enregistrés', result });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Résultats déjà soumis pour ce module' });
    }
    next(err);
  }
});

// -----------------------------------------------------------------------
// GET /api/reporting/results/:moduleId
// Liste des résultats pour un module (enseignant/admin)
// -----------------------------------------------------------------------
router.get('/results/:moduleId', authorize('admin_ddene', 'teacher'), async (req, res, next) => {
  try {
    const results = await QuizResult.find({
      module_id: req.params.moduleId,
      ...req.tenantFilter(),
    })
      .sort({ percentage: -1 })
      .lean();

    // Stats globales
    const total = results.length;
    const avgScore = total > 0 ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / total) : 0;
    const passed = results.filter(r => r.percentage >= 60).length;

    res.json({
      moduleId: req.params.moduleId,
      stats: { total, avgScore, passed, failed: total - passed },
      results: results.map(r => ({
        _id: r._id,
        user_id: r.user_id,
        studentName: r.studentName,
        studentEmail: r.studentEmail,
        totalScore: r.totalScore,
        maxScore: r.maxScore,
        percentage: r.percentage,
        duration: r.duration,
        completedAt: r.completedAt,
        answersCount: r.answers.length,
        correctCount: r.answers.filter(a => a.isCorrect).length,
        ai_commentary: r.ai_commentary || '',
        hasRemediation: r.remediation?.generated || false,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------
// GET /api/reporting/result/:resultId
// Détail complet d'un résultat (avec toutes les réponses)
// -----------------------------------------------------------------------
router.get('/result/:resultId', authorize('admin_ddene', 'teacher'), async (req, res, next) => {
  try {
    const result = await QuizResult.findOne({
      _id: req.params.resultId,
      ...req.tenantFilter(),
    }).lean();

    if (!result) return res.status(404).json({ error: 'Résultat introuvable' });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------
// GET /api/reporting/pdf/:resultId
// Générer le rapport PDF individuel (style Socrative)
// -----------------------------------------------------------------------
router.get('/pdf/:resultId', authorize('admin_ddene', 'teacher'), requireFeature('exportPDF'), async (req, res, next) => {
  try {
    const result = await QuizResult.findOne({
      _id: req.params.resultId,
      ...req.tenantFilter(),
    }).lean();

    if (!result) return res.status(404).json({ error: 'Résultat introuvable' });

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 15;

    // --- Header ---
    // Logo area (TEGS Learning branding)
    doc.setFillColor(30, 64, 175); // DDENE blue
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('TEGS Learning', margin, 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('DDENE - Direction Departementale Education Nord-Est', margin, 22);

    // Student info (right side of header)
    doc.setFontSize(10);
    doc.text(result.studentName, pageWidth - margin, 12, { align: 'right' });
    doc.text(result.studentEmail || '', pageWidth - margin, 18, { align: 'right' });
    const dateStr = new Date(result.completedAt).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    doc.text(dateStr, pageWidth - margin, 24, { align: 'right' });

    y = 42;

    // --- Module title + Score ---
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(result.moduleTitle, margin, y);

    // Score badge (right)
    const scoreText = `${result.percentage}% (${result.totalScore}/${result.maxScore})`;
    doc.setFontSize(20);
    const scoreColor = result.percentage >= 60 ? [34, 197, 94] : [239, 68, 68];
    doc.setTextColor(...scoreColor);
    doc.text(scoreText, pageWidth - margin, y, { align: 'right' });

    y += 5;

    // Duration if available
    if (result.duration) {
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Duree: ${formatDuration(result.duration)}`, pageWidth - margin, y + 3, { align: 'right' });
    }

    y += 10;

    // Separator
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // --- Questions ---
    for (const answer of result.answers) {
      // Check if we need a new page
      if (y > 260) {
        doc.addPage();
        y = 15;
      }

      // Status icon (check or X)
      const isCorrect = answer.isCorrect;
      if (isCorrect) {
        doc.setFillColor(34, 197, 94); // green
      } else {
        doc.setFillColor(239, 68, 68); // red
      }
      doc.circle(margin + 4, y + 2, 4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(isCorrect ? 'V' : 'X', margin + 4, y + 3.5, { align: 'center' });

      // Question number + text
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      const qNum = `${answer.questionNumber}.`;
      doc.text(qNum, margin + 12, y + 3);

      doc.setFont('helvetica', 'normal');
      const qTextLines = doc.splitTextToSize(
        truncateText(answer.questionText, 200),
        pageWidth - margin * 2 - 22
      );
      doc.text(qTextLines, margin + 20, y + 3);
      y += Math.max(8, qTextLines.length * 5) + 2;

      // Points badge
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.text(`${answer.pointsEarned}/${answer.maxPoints} POINTS`, margin + 20, y);
      y += 5;

      // Student answer
      const studentAnswerStr = formatAnswer(answer.studentAnswer, answer.questionType);
      const correctAnswerStr = formatAnswer(answer.correctAnswer, answer.questionType);

      if (isCorrect) {
        // Show answer with green indicator
        doc.setFillColor(34, 197, 94);
        doc.circle(margin + 22, y + 1.5, 2.5, 'F');
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const ansLines = doc.splitTextToSize(studentAnswerStr, pageWidth - margin * 2 - 32);
        doc.text(ansLines, margin + 28, y + 2.5);
        y += Math.max(6, ansLines.length * 4) + 2;
      } else {
        // Student answer (red indicator)
        doc.setFillColor(239, 68, 68);
        doc.circle(margin + 22, y + 1.5, 2.5, 'F');
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const wrongLines = doc.splitTextToSize(studentAnswerStr, pageWidth - margin * 2 - 32);
        doc.text(wrongLines, margin + 28, y + 2.5);
        y += Math.max(6, wrongLines.length * 4) + 2;

        // Correct answer (green)
        doc.setFillColor(34, 197, 94);
        doc.circle(margin + 22, y + 1.5, 2.5, 'F');
        doc.setTextColor(34, 127, 74);
        doc.setFont('helvetica', 'italic');
        const correctLines = doc.splitTextToSize(`Reponse correcte: ${correctAnswerStr}`, pageWidth - margin * 2 - 32);
        doc.text(correctLines, margin + 28, y + 2.5);
        y += Math.max(6, correctLines.length * 4) + 2;
      }

      // Show choices for QCM
      if (answer.questionType === 'quiz' && answer.choices && Array.isArray(answer.choices)) {
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        for (let i = 0; i < answer.choices.length && i < 8; i++) {
          const choiceText = typeof answer.choices[i] === 'object' ? answer.choices[i].text : answer.choices[i];
          if (choiceText) {
            doc.setFont('helvetica', 'bold');
            doc.text(letters[i], margin + 22, y + 2);
            doc.setFont('helvetica', 'normal');
            doc.text(truncateText(String(choiceText), 80), margin + 28, y + 2);
            y += 4;
          }
        }
      }

      // Feedback
      if (answer.feedback) {
        doc.setFontSize(8);
        doc.setTextColor(59, 130, 246);
        doc.setFont('helvetica', 'italic');
        const fbLines = doc.splitTextToSize(`Feedback: ${answer.feedback}`, pageWidth - margin * 2 - 22);
        doc.text(fbLines, margin + 20, y + 1);
        y += fbLines.length * 3.5 + 2;
      }

      y += 4;

      // Light separator between questions
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.3);
      doc.line(margin + 12, y, pageWidth - margin, y);
      y += 4;
    }

    // --- AI Commentary (if exists) ---
    if (result.ai_commentary) {
      if (y > 230) {
        doc.addPage();
        y = 15;
      }
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(margin, y, pageWidth - margin * 2, 40, 3, 3, 'F');
      y += 6;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 64, 175);
      doc.text('Commentaire IA', margin + 5, y);
      y += 5;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      const commentLines = doc.splitTextToSize(result.ai_commentary, pageWidth - margin * 2 - 10);
      doc.text(commentLines, margin + 5, y);
    }

    // --- Footer ---
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `TEGS Learning - Rapport genere le ${new Date().toLocaleDateString('fr-FR')} - Page ${p}/${totalPages}`,
        pageWidth / 2, 290,
        { align: 'center' }
      );
    }

    // Output
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    const filename = `rapport-${sanitizeFilename(result.studentName)}-${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------
// GET /api/reporting/excel/:moduleId
// Export Excel global des notes (tous les participants)
// -----------------------------------------------------------------------
router.get('/excel/:moduleId', authorize('admin_ddene', 'teacher'), requireFeature('exportExcel'), async (req, res, next) => {
  try {
    const mod = await Module.findOne({
      _id: req.params.moduleId,
      ...req.tenantFilter(),
    }).lean();
    if (!mod) return res.status(404).json({ error: 'Module introuvable' });

    const results = await QuizResult.find({
      module_id: req.params.moduleId,
      ...req.tenantFilter(),
    })
      .sort({ studentName: 1 })
      .lean();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TEGS Learning';
    workbook.created = new Date();

    // --- Sheet 1: Récapitulatif des notes ---
    const sheet1 = workbook.addWorksheet('Notes', {
      properties: { tabColor: { argb: '1E40AF' } },
    });

    // Header row styling
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E40AF' } };
    const headerFont = { color: { argb: 'FFFFFF' }, bold: true, size: 11 };

    // Title rows
    sheet1.mergeCells('A1:H1');
    const titleCell = sheet1.getCell('A1');
    titleCell.value = `TEGS Learning - ${mod.title}`;
    titleCell.font = { bold: true, size: 14, color: { argb: '1E40AF' } };

    sheet1.mergeCells('A2:H2');
    sheet1.getCell('A2').value = `Exporté le ${new Date().toLocaleDateString('fr-FR')} | ${results.length} participants`;
    sheet1.getCell('A2').font = { size: 10, color: { argb: '64748B' } };

    // Column definitions
    sheet1.columns = [
      { key: 'rank', header: '#', width: 5 },
      { key: 'name', header: 'Nom de l\'élève', width: 28 },
      { key: 'email', header: 'Email', width: 28 },
      { key: 'score', header: 'Score', width: 12 },
      { key: 'max', header: 'Max', width: 8 },
      { key: 'percentage', header: '%', width: 8 },
      { key: 'status', header: 'Statut', width: 12 },
      { key: 'date', header: 'Date', width: 18 },
    ];

    // Header row (row 4)
    const headerRow = sheet1.getRow(4);
    headerRow.values = ['#', 'Nom de l\'élève', 'Email', 'Score', 'Max', '%', 'Statut', 'Date'];
    headerRow.eachCell(cell => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        bottom: { style: 'thin', color: { argb: '1E40AF' } },
      };
    });
    headerRow.height = 25;

    // Data rows
    const sorted = [...results].sort((a, b) => b.percentage - a.percentage);
    sorted.forEach((r, i) => {
      const row = sheet1.getRow(5 + i);
      row.values = [
        i + 1,
        r.studentName,
        r.studentEmail,
        r.totalScore,
        r.maxScore,
        r.percentage,
        r.percentage >= 60 ? 'Réussi' : 'Échoué',
        new Date(r.completedAt).toLocaleDateString('fr-FR'),
      ];

      // Alternate row colors
      if (i % 2 === 0) {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
        });
      }

      // Color status cell
      const statusCell = row.getCell(7);
      statusCell.font = {
        bold: true,
        color: { argb: r.percentage >= 60 ? '16A34A' : 'DC2626' },
      };

      // Color percentage cell
      const pctCell = row.getCell(6);
      pctCell.font = {
        bold: true,
        color: { argb: r.percentage >= 60 ? '16A34A' : 'DC2626' },
      };

      row.alignment = { vertical: 'middle' };
    });

    // Stats summary row
    const statsRow = sheet1.getRow(5 + results.length + 1);
    const avgPct = results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length)
      : 0;
    const passedCount = results.filter(r => r.percentage >= 60).length;
    statsRow.values = [
      '', 'MOYENNE', '', '',  '', avgPct, `${passedCount}/${results.length} réussis`, '',
    ];
    statsRow.font = { bold: true, size: 11 };
    statsRow.getCell(6).font = { bold: true, size: 12, color: { argb: '1E40AF' } };

    // --- Sheet 2: Détail par question ---
    if (results.length > 0 && results[0].answers.length > 0) {
      const sheet2 = workbook.addWorksheet('Détail Questions', {
        properties: { tabColor: { argb: '22C55E' } },
      });

      // Build columns: Name + one column per question
      const qCount = Math.max(...results.map(r => r.answers.length));
      const cols = [{ key: 'name', header: 'Élève', width: 25 }];
      for (let q = 1; q <= qCount; q++) {
        cols.push({ key: `q${q}`, header: `Q${q}`, width: 10 });
      }
      cols.push({ key: 'total', header: 'Total', width: 10 });
      sheet2.columns = cols;

      // Header
      const hRow2 = sheet2.getRow(1);
      hRow2.values = cols.map(c => c.header);
      hRow2.eachCell(cell => {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = { horizontal: 'center' };
      });

      // Data
      sorted.forEach((r, i) => {
        const row = sheet2.getRow(2 + i);
        const vals = [r.studentName];
        r.answers.forEach(a => {
          vals.push(a.isCorrect ? a.pointsEarned : 0);
        });
        // Pad if fewer answers
        while (vals.length < qCount + 1) vals.push('');
        vals.push(r.totalScore);
        row.values = vals;

        // Color cells
        r.answers.forEach((a, qi) => {
          const cell = row.getCell(qi + 2);
          cell.font = {
            color: { argb: a.isCorrect ? '16A34A' : 'DC2626' },
            bold: true,
          };
        });
      });

      // Question texts as comments on header cells
      if (sorted[0]) {
        sorted[0].answers.forEach((a, qi) => {
          const cell = hRow2.getCell(qi + 2);
          cell.note = truncateText(a.questionText, 150);
        });
      }
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `notes-${sanitizeFilename(mod.title)}-${Date.now()}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------
// POST /api/reporting/ai-commentary/:resultId
// Générer un commentaire IA de synthèse pour un élève
// -----------------------------------------------------------------------
router.post('/ai-commentary/:resultId', authorize('admin_ddene', 'teacher'), requireFeature('aiCommentary'), async (req, res, next) => {
  try {
    const result = await QuizResult.findOne({
      _id: req.params.resultId,
      ...req.tenantFilter(),
    });
    if (!result) return res.status(404).json({ error: 'Résultat introuvable' });

    // Build analysis prompt
    const correctAnswers = result.answers.filter(a => a.isCorrect);
    const wrongAnswers = result.answers.filter(a => !a.isCorrect);

    const prompt = `Tu es un enseignant bienveillant en Haïti (DDENE). Rédige un commentaire de synthèse en français (3-5 phrases) pour cet élève.

Élève: ${result.studentName}
Module: ${result.moduleTitle}
Score: ${result.totalScore}/${result.maxScore} (${result.percentage}%)

Questions réussies (${correctAnswers.length}):
${correctAnswers.map(a => `- ${a.questionText}`).join('\n')}

Questions échouées (${wrongAnswers.length}):
${wrongAnswers.map(a => `- ${a.questionText} (réponse: ${formatAnswer(a.studentAnswer, a.questionType)}, correct: ${formatAnswer(a.correctAnswer, a.questionType)})`).join('\n')}

Consignes:
- Commence par un encouragement
- Mentionne les points forts (concepts maîtrisés)
- Identifie les lacunes spécifiques
- Termine par un conseil d'amélioration concret
- Reste concis et bienveillant`;

    const commentary = await callAIGateway(prompt, 'generate', req.tenantId);

    result.ai_commentary = commentary;
    await result.save();

    res.json({ commentary });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------
// POST /api/reporting/ai-commentary-batch/:moduleId
// Générer les commentaires IA pour tous les participants d'un module
// -----------------------------------------------------------------------
router.post('/ai-commentary-batch/:moduleId', authorize('admin_ddene', 'teacher'), requireFeature('aiCommentary'), async (req, res, next) => {
  try {
    const results = await QuizResult.find({
      module_id: req.params.moduleId,
      ...req.tenantFilter(),
      ai_commentary: { $in: ['', null] },
    });

    if (results.length === 0) {
      return res.json({ message: 'Tous les commentaires sont déjà générés', count: 0 });
    }

    let generated = 0;
    for (const result of results) {
      try {
        const correctAnswers = result.answers.filter(a => a.isCorrect);
        const wrongAnswers = result.answers.filter(a => !a.isCorrect);

        const prompt = `Tu es un enseignant bienveillant en Haïti (DDENE). Rédige un commentaire de synthèse court en français (3-4 phrases) pour cet élève.

Élève: ${result.studentName} | Score: ${result.totalScore}/${result.maxScore} (${result.percentage}%)
Réussies: ${correctAnswers.map(a => a.questionText).join(', ')}
Échouées: ${wrongAnswers.map(a => a.questionText).join(', ')}

Sois encourageant, mentionne les points forts et les lacunes, et donne un conseil concret.`;

        const commentary = await callAIGateway(prompt, 'generate', req.tenantId);
        result.ai_commentary = commentary;
        await result.save();
        generated++;
      } catch (e) {
        console.error(`[REPORTING] AI commentary failed for ${result.studentName}:`, e.message);
      }
    }

    res.json({ message: `${generated}/${results.length} commentaires générés`, count: generated });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------
// POST /api/reporting/remediation/:resultId
// Générer un quiz de remédiation IA ciblé sur les lacunes
// -----------------------------------------------------------------------
router.post('/remediation/:resultId', authorize('admin_ddene', 'teacher'), requireFeature('aiRemediation'), async (req, res, next) => {
  try {
    const result = await QuizResult.findOne({
      _id: req.params.resultId,
      ...req.tenantFilter(),
    });
    if (!result) return res.status(404).json({ error: 'Résultat introuvable' });

    const wrongAnswers = result.answers.filter(a => !a.isCorrect);
    if (wrongAnswers.length === 0) {
      return res.json({
        message: 'Aucune erreur détectée - pas de remédiation nécessaire',
        quiz: null,
      });
    }

    // Identify weak concepts
    const weakAreas = wrongAnswers.map(a => ({
      question: a.questionText,
      type: a.questionType,
      studentAnswer: formatAnswer(a.studentAnswer, a.questionType),
      correctAnswer: formatAnswer(a.correctAnswer, a.questionType),
    }));

    const blockTypes = ['quiz', 'true_false', 'numeric', 'fill_blank', 'matching', 'sequence'];
    const availableTypes = blockTypes.filter(t =>
      wrongAnswers.some(a => a.questionType === t) || Math.random() > 0.5
    ).slice(0, 4);

    const prompt = `Tu es un expert en pédagogie pour la DDENE (Haïti). Génère un quiz de REMÉDIATION en JSON pour renforcer les concepts non maîtrisés.

Élève: ${result.studentName}
Module: ${result.moduleTitle}
Erreurs identifiées:
${weakAreas.map((w, i) => `${i + 1}. Question: "${w.question}" | Réponse élève: "${w.studentAnswer}" | Correct: "${w.correctAnswer}" | Type: ${w.type}`).join('\n')}

CONSIGNES:
- Génère ${Math.min(wrongAnswers.length * 2, 10)} questions de remédiation
- Varie les types parmi: ${availableTypes.join(', ')}
- Chaque question cible un concept échoué mais formulée DIFFÉREMMENT
- Les questions doivent être progressives (facile → difficile)
- Langue: français

FORMAT JSON STRICT (array):
[
  {
    "type": "quiz",
    "questionText": "...",
    "choices": ["A", "B", "C", "D"],
    "correctAnswer": "A",
    "points": 5,
    "feedback": "Explication courte..."
  },
  {
    "type": "true_false",
    "questionText": "...",
    "correctAnswer": true,
    "points": 5,
    "feedback": "..."
  },
  {
    "type": "fill_blank",
    "questionText": "Le {{mot}} est ...",
    "correctAnswer": "mot",
    "points": 5,
    "feedback": "..."
  }
]

IMPORTANT: Retourne UNIQUEMENT le JSON, sans texte avant/après.`;

    const aiResponse = await callAIGateway(prompt, 'generate', req.tenantId);

    // Parse AI response
    let quiz;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      quiz = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResponse);
    } catch (parseErr) {
      return res.status(502).json({
        error: 'Erreur de parsing de la réponse IA',
        raw: aiResponse,
      });
    }

    result.remediation = {
      generated: true,
      generatedAt: new Date(),
      quiz,
    };
    await result.save();

    res.json({
      message: `Quiz de remédiation généré: ${quiz.length} questions`,
      quiz,
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------
// GET /api/reporting/module-timer/:moduleId
// Calculer la durée totale d'un module (somme des durées des questions)
// -----------------------------------------------------------------------
router.get('/module-timer/:moduleId', async (req, res, next) => {
  try {
    const mod = await Module.findOne({
      _id: req.params.moduleId,
      ...req.tenantFilter(),
    }).lean();
    if (!mod) return res.status(404).json({ error: 'Module introuvable' });

    // Check for global time limit first
    if (mod.globalTimeLimit && mod.globalTimeLimit > 0) {
      return res.json({
        source: 'global',
        totalMinutes: mod.globalTimeLimit,
        totalSeconds: mod.globalTimeLimit * 60,
        breakdown: [],
      });
    }

    // Sum up individual question durations
    const breakdown = [];
    let totalMinutes = 0;

    for (const section of mod.sections || []) {
      for (const screen of section.screens || []) {
        for (const block of screen.contentBlocks || []) {
          const d = block.data || {};
          const questionTypes = ['quiz', 'true_false', 'numeric', 'fill_blank', 'matching', 'sequence', 'likert', 'open_answer'];
          if (questionTypes.includes(block.type) && d.duration && d.duration > 0) {
            totalMinutes += d.duration;
            breakdown.push({
              blockId: block._id,
              type: block.type,
              question: truncateText(d.question || d.text || d.questionText || '', 80),
              duration: d.duration,
            });
          }
        }
      }
    }

    res.json({
      source: totalMinutes > 0 ? 'questions' : 'none',
      totalMinutes,
      totalSeconds: totalMinutes * 60,
      breakdown,
    });
  } catch (err) {
    next(err);
  }
});

// =======================================================================
// Helpers
// =======================================================================

function truncateText(str, max) {
  if (!str) return '';
  const s = String(str);
  return s.length > max ? s.substring(0, max) + '...' : s;
}

function sanitizeFilename(str) {
  return (str || 'export')
    .replace(/[^a-zA-Z0-9\u00C0-\u024F_-]/g, '_')
    .substring(0, 50);
}

function formatDuration(iso) {
  if (!iso) return '';
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return iso;
  const h = match[1] ? `${match[1]}h ` : '';
  const m = match[2] ? `${match[2]}min ` : '';
  const s = match[3] ? `${match[3]}s` : '';
  return `${h}${m}${s}`.trim() || '0s';
}

function formatAnswer(answer, type) {
  if (answer === null || answer === undefined) return '(aucune réponse)';
  if (typeof answer === 'boolean') return answer ? 'Vrai' : 'Faux';
  if (Array.isArray(answer)) return answer.join(', ');
  if (typeof answer === 'object') {
    try { return JSON.stringify(answer); } catch { return String(answer); }
  }
  return String(answer);
}

/**
 * Call the dp-ai-gateway-service for AI generation.
 * Falls back to a placeholder if gateway is unavailable.
 */
async function callAIGateway(prompt, taskType, tenantId) {
  const gatewayUrl = process.env.AI_GATEWAY_URL || 'https://dp-ai-gateway-service-746425674533.us-central1.run.app';
  const gatewayToken = process.env.GATEWAY_AUTH_TOKEN;

  if (!gatewayToken) {
    console.warn('[REPORTING] GATEWAY_AUTH_TOKEN not set - returning placeholder');
    return '[Commentaire IA non disponible - configurez GATEWAY_AUTH_TOKEN]';
  }

  try {
    const { default: fetch } = await import('node-fetch').catch(() => ({ default: globalThis.fetch }));

    const response = await fetch(`${gatewayUrl}/api/ai-gateway`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${gatewayToken}`,
      },
      body: JSON.stringify({
        prompt,
        task_type: taskType,
        preferred_tier: 'auto',
        preferred_model: 'gemini-2.0-flash',
        service_id: 'tegs-learning',
        user_id: String(tenantId),
        max_tokens: 1500,
        temperature: 0.7,
        language: 'fr',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gateway ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return data.response || data.text || data.content || '';
  } catch (err) {
    console.error('[REPORTING] AI Gateway error:', err.message);
    return `[Erreur IA: ${err.message}]`;
  }
}

module.exports = router;
