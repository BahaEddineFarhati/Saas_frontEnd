# I18N — Guide du Système de Traduction

## Architecture

Le système de traduction repose sur **React Context** (zéro dépendance externe).

```
src/i18n/
├── I18nContext.tsx    ← Provider, hook useTranslation(), logique de résolution
└── locales/
    ├── fr.json        ← Fichier source (français — langue par défaut)
    └── en.json        ← Traduction anglaise (miroir de fr.json)
```

## Utilisation dans un composant

```tsx
import { useTranslation } from '../i18n/I18nContext';

function MonComposant() {
  const { t, locale, setLocale } = useTranslation();

  return (
    <div>
      <h1>{t('dashboard.greeting.morning')}</h1>
      <p>{t('dashboard.kpi.totalOpenings', { count: 42 })}</p>
      <button onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}>
        {locale === 'fr' ? 'English' : 'Français'}
      </button>
    </div>
  );
}
```

## Conventions de nommage des clés

Les clés utilisent la **notation point** (dot-notation), organisées par domaine :

| Préfixe | Portée |
|---------|--------|
| `common.*` | Boutons, labels et messages partagés (Enregistrer, Annuler…) |
| `nav.*` | Labels du menu latéral |
| `pageTitles.*` | Titres de pages (balise `<title>`) |
| `validation.*` | Messages d'erreur de validation (formulaires) |
| `settings.*` | Page Paramètres (profil + mot de passe) |
| `entreprise.*` | Page Entreprise (équipe, org, IA) |
| `dashboard.*` | Page Tableau de bord (KPIs, graphiques, activité) |
| `candidatures.*` | Page Candidatures (liste, formulaire, suppression) |
| `jobDetail.*` | Page Détail d'une offre (candidats, filtres, upload, verdicts) |
| `candidateDetail.*` | Page Détail d'un candidat (profil, score, comparaison) |
| `login.*` | Page de connexion |
| `forgotPassword.*` | Page mot de passe oublié |
| `resetPassword.*` | Page réinitialisation |
| `acceptInvite.*` | Page acceptation d'invitation |
| `suspension.*` | Modal de suspension |
| `chat.*` | Panel de chat IA |
| `admin.*` | Pages d'administration (dashboard, organisations, détail org) |

### Règles de nommage

1. **camelCase** pour chaque segment : `dashboard.kpi.activeOpenings`
2. **Hiérarchie logique** : `[page].[section].[element]`
3. **Pas de texte hardcodé** dans les composants — tout passe par `t()`

## Interpolation de variables

Les variables sont encadrées par `{}` :

```json
{
  "dashboard": {
    "kpi": {
      "totalOpenings": "sur {count} au total",
      "failedCount": "{count} en échec"
    },
    "summary": "{activeJobs} offre{jobPlural} active{jobPlural}"
  }
}
```

```tsx
t('dashboard.kpi.totalOpenings', { count: 15 })
// → "sur 15 au total"

t('dashboard.summary', { activeJobs: 3, jobPlural: 's' })
// → "3 offres actives"
```

## Ajouter une nouvelle chaîne

1. **Ajouter la clé dans `fr.json`** (fichier source)
2. **Ajouter la traduction dans `en.json`** (miroir)
3. **Utiliser `t('ma.cle')` dans le composant**

```json
// fr.json
{
  "maPage": {
    "monBouton": "Cliquez ici"
  }
}

// en.json
{
  "maPage": {
    "monBouton": "Click here"
  }
}
```

```tsx
<button>{t('maPage.monBouton')}</button>
```

## Ajouter une nouvelle langue

1. Créer `src/i18n/locales/xx.json` (copie de `fr.json` avec les traductions)
2. Ajouter l'import dans `I18nContext.tsx` :

```tsx
import xx from './locales/xx.json';

const TRANSLATIONS: Record<string, Record<string, any>> = { fr, en, xx };
type Locale = 'fr' | 'en' | 'xx';
```

## Composants `memo()` et hooks

Les composants wrappés dans `memo()` peuvent utiliser `useTranslation()` normalement —
le hook est appelé **à l'intérieur** de la fonction composant :

```tsx
const MonComposant = memo(function MonComposant() {
  const { t } = useTranslation();
  return <p>{t('maPage.monTexte')}</p>;
});
```

## Fallback

Si une clé n'existe pas dans la locale active, le système :
1. Cherche dans `fr.json` (langue par défaut)
2. Retourne la clé elle-même si introuvable (`[maPage.cleMissing]`)

## Persistance

La locale choisie est sauvegardée dans `localStorage` (`i18n_locale`).
Au rechargement, l'utilisateur retrouve sa langue.
