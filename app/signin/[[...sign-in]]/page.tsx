import React from 'react';
import SignInForm from '@/components/SignInForm';
import { AuthLayout } from '@/components/AuthLayout';

const Page: React.FC = () => {
  return (
    <AuthLayout id="clerk-captcha">
      <SignInForm />
    </AuthLayout>
  );
};

export default Page;
