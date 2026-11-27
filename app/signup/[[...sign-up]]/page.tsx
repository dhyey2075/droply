import React from 'react';
import SignUpForm from '@/components/SignUpForm';
import { AuthLayout } from '@/components/AuthLayout';

const Page: React.FC = () => {
  return (
    <AuthLayout>
      <SignUpForm />
    </AuthLayout>
  );
};

export default Page;
