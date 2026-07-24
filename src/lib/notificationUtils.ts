/**
 * Helper utility to localize notification titles and messages according to active locale.
 */
export function formatNotification(
  notification: {
    type: string;
    title: string;
    message: string;
  },
  t: (key: string, params?: Record<string, string | number>) => string
): { title: string; message: string } {
  let title = notification.title;
  if (notification.type === 'JOB_PARSING_COMPLETED') {
    title = t('notifications.title.JOB_PARSING_COMPLETED');
  } else if (notification.type === 'JOB_PARSING_FAILED') {
    title = t('notifications.title.JOB_PARSING_FAILED');
  }

  // Match backend generated pattern:
  // "L'analyse de 5 CVs pour le poste Dev est terminée. 5 candidats analysés avec succès, 0 en échec."
  const match = notification.message.match(
    /L['']analyse de (\d+) CVs? pour le poste (.*?) est terminée\.\s*(\d+) candidats? analysés? avec succès,\s*(\d+) en échec\./i
  );

  if (match) {
    const total = parseInt(match[1], 10);
    const jobTitle = match[2].trim();
    const success = parseInt(match[3], 10);
    const failed = parseInt(match[4], 10);

    const message = t('notifications.message.parsingCompleted', {
      total,
      plural: total > 1 ? 's' : '',
      jobTitle,
      success,
      successPlural: success > 1 ? 's' : '',
      failed,
    });

    return { title, message };
  }

  return { title, message: notification.message };
}
