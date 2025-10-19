import { useState } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <form onSubmit={handleSearch} className="mb-8">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-indigo-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search photos by keyword or tags..."
          className="block w-full pl-12 pr-12 py-4 border border-indigo-200 rounded-xl text-indigo-900 placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all bg-white shadow-sm"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-indigo-400 hover:text-indigo-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </form>
  );
}
