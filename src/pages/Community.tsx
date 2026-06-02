import { Users } from 'lucide-react';

const Community = () => {
  return (
    <div className="min-h-screen bg-[#FBFBFB] pt-24">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-3xl flex-col items-center justify-center px-4 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-gray-100 bg-white shadow-sm">
          <Users className="h-10 w-10 text-gray-200" />
        </div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">
          Community Tasks
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-gray-950 md:text-6xl">
          Coming soon
        </h1>
        <p className="mt-5 max-w-xl text-base font-normal leading-7 text-gray-500 md:text-lg">
          We are building a better way for creators, brands, and communities to collaborate on paid tasks.
        </p>
      </div>
    </div>
  );
};

export default Community;
