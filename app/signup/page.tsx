import React from 'react';
import SignUpForm from '@/components/SignUpForm';

const Page: React.FC = () => {
  return (
      <div className='flex flex-col items-center justify-center h-screen'>
        <SignUpForm />
      </div>
  );
};

export default Page;