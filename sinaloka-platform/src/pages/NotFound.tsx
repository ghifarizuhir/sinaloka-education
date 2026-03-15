import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/UI';

export const NotFound = () => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <h2 className="text-4xl font-bold mb-2 dark:text-zinc-100">404</h2>
    <p className="text-zinc-500 mb-6">The page you're looking for doesn't exist.</p>
    <Link to="/">
      <Button>Back to Dashboard</Button>
    </Link>
  </div>
);
