import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/UI';

export const NotFound = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h2 className="text-4xl font-bold mb-2 dark:text-zinc-100">{t('notFound.title')}</h2>
      <p className="text-zinc-500 mb-6">{t('notFound.message')}</p>
      <Link to="/dashboard">
        <Button>{t('notFound.backToDashboard')}</Button>
      </Link>
    </div>
  );
};
