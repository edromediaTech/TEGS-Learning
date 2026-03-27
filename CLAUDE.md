# TEGS-Learning — Instructions Agent

## SIGEPRO Tracking (OBLIGATOIRE)

Ce projet est suivi par SIGEPRO. Chaque commit DOIT respecter ces règles :

### Format de commit
```
<prefix>: <description> [TAG]
```

### Préfixes
- `feat:` — nouvelle fonctionnalité
- `fix:` — correction de bug
- `docs:` — documentation
- `ui:` — interface utilisateur
- `refactor:` — refactoring
- `test:` — tests
- `chore:` — maintenance

### Tags SIGEPRO (au moins un par commit)
- `[DONE]` — marque la tâche comme terminée (UTILISER quand le travail est fini)
- `[REVIEW]` — marque la tâche en review
- `[TASK:ObjectId]` — cible une tâche précise par son ID

### Exemples
```
feat: Studio drag-and-drop complet [DONE]
fix: correction cookie session [DONE]
feat: Arena Sync en cours [REVIEW]
```

### IMPORTANT
- Si tu termines une fonctionnalité, tu DOIS ajouter `[DONE]` au commit
- Sans `[DONE]`, la tâche reste "en_cours" et l'avancement du projet N'AUGMENTE PAS
- Un commit sans tag = travail invisible pour le suivi projet
