import React from 'react';
import SignInForm from '@/components/SignInForm';

const Page: React.FC = () => {
  return (
    <div id="clerk-captcha" className='flex flex-col items-center justify-center min-h-screen p-4'>
      <div className="w-full max-w-md">
        <SignInForm />
      </div>
    </div>
  );
};

export default Page;