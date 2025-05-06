import React from 'react';
import SignInForm from '@/components/SignInForm';

const Page: React.FC = () => {
  return (
    <div id="clerk-captcha" className='flex flex-col items-center justify-center h-screen'>
      <SignInForm />
    </div>
  );
};

export default Page;