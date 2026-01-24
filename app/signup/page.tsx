import React from 'react';
import SignUpForm from '@/components/SignUpForm';

const Page: React.FC = () => {
  return (
      <div className='flex flex-col items-center justify-center min-h-screen p-4'>
        <div className="w-full max-w-md">
          <SignUpForm />
        </div>
      </div>
  );
};

export default Page;