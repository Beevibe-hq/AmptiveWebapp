import React from 'react';
import { History, Library, Plus } from 'lucide-react';

const Sidebar = () => {
  return (
    <div className="flex flex-col w-12 bg-white border border-gray-200 rounded-2xl py-2 items-center fixed left-0 top-1/2 -translate-y-1/2 z-10 ml-4 shadow-sm">
      <div className="flex flex-col space-y-4">
        {/* Add Icon */}
        <button 
          className="w-8 h-8 rounded-full bg-black text-white group relative flex items-center justify-center"
          title="New Chat"
        >
          <Plus className="h-4 w-4" strokeWidth={3} />
        </button>
        
        {/* Library Icon */}
        <button 
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-700 group relative"
          title="Library"
        >
          <ion-icon name="images-outline" class="text-lg"></ion-icon>
          <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
            Library
          </span>
        </button>
        
        {/* Chats (History) Icon */}
        <button 
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-700 group relative"
          title="Chats"
        >
          <ion-icon name="chatbubbles-outline" class="text-lg"></ion-icon>
          <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
            Chats
          </span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
