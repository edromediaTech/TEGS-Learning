/**
 * Generateur de manifeste cmi5.xml.
 * Convertit un module TEGS-Learning en package cmi5 conforme au standard ADL.
 *
 * Structure cmi5 :
 *   <courseStructure>
 *     <course id="...">
 *       <title><langstring>...</langstring></title>
 *       <description><langstring>...</langstring></description>
 *     </course>
 *     <block id="...">  (= Section/Chapitre)
 *       <title>...</title>
 *       <au id="...">    (= Ecran/Page)
 *         <title>...</title>
 *         <url>...</url>
 *       </au>
 *     </block>
 *   </courseStructure>
 */

function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Genere le manifeste cmi5.xml pour un module.
 * @param {Object} mod - Document Mongoose du module
 * @param {string} baseUrl - URL de base du serveur (ex: http://localhost:3000)
 * @returns {string} XML cmi5 conforme
 */
function generateCmi5Xml(mod, baseUrl) {
  const lang = mod.language || 'fr';
  const courseId = `https://tegs-learning.edu.ht/courses/${mod._id}`;

  let xml = `<?xml version="1.0" encoding="utf-8"?>\n`;
  xml += `<courseStructure xmlns="https://w3id.org/xapi/profiles/cmi5/v1/CourseStructure.xsd">\n`;

  // Course
  xml += `  <course id="${escapeXml(courseId)}">\n`;
  xml += `    <title>\n`;
  xml += `      <langstring lang="${escapeXml(lang)}">${escapeXml(mod.title)}</langstring>\n`;
  xml += `    </title>\n`;
  xml += `    <description>\n`;
  xml += `      <langstring lang="${escapeXml(lang)}">${escapeXml(mod.description || '')}</langstring>\n`;
  xml += `    </description>\n`;
  xml += `  </course>\n`;

  // Blocks (Sections) et AUs (Ecrans)
  for (const section of mod.sections || []) {
    const blockId = `${courseId}/blocks/${section._id}`;

    xml += `  <block id="${escapeXml(blockId)}">\n`;
    xml += `    <title>\n`;
    xml += `      <langstring lang="${escapeXml(lang)}">${escapeXml(section.title)}</langstring>\n`;
    xml += `    </title>\n`;

    for (const screen of section.screens || []) {
      const auId = `${courseId}/au/${screen._id}`;
      const launchUrl = `${baseUrl}/api/cmi5/player/${mod._id}/${screen._id}`;

      xml += `    <au id="${escapeXml(auId)}" moveOn="CompletedOrPassed" launchMethod="AnyWindow">\n`;
      xml += `      <title>\n`;
      xml += `        <langstring lang="${escapeXml(lang)}">${escapeXml(screen.title)}</langstring>\n`;
      xml += `      </title>\n`;
      xml += `      <url>${escapeXml(launchUrl)}</url>\n`;
      xml += `    </au>\n`;
    }

    xml += `  </block>\n`;
  }

  xml += `</courseStructure>\n`;

  return xml;
}

module.exports = { generateCmi5Xml, escapeXml };
