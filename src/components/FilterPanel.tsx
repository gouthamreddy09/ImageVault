import { Filter, X } from 'lucide-react';

interface FilterPanelProps {
  allTags: string[];
  selectedTags: string[];
  onTagSelect: (tag: string) => void;
  onClearFilters: () => void;
}

export default function FilterPanel({ allTags, selectedTags, onTagSelect, onClearFilters }: FilterPanelProps) {
  if (allTags.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-indigo-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-indigo-900">Filter by Tags</h3>
        </div>
        {selectedTags.length > 0 && (
          <button
            onClick={onClearFilters}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Clear Filters
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {allTags.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => onTagSelect(tag)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all shadow-sm ${
                isSelected
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border border-indigo-200'
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>

      {selectedTags.length > 0 && (
        <div className="mt-4 pt-4 border-t border-indigo-100">
          <p className="text-sm text-indigo-700">
            Active filters: <span className="font-semibold">{selectedTags.join(', ')}</span>
          </p>
        </div>
      )}
    </div>
  );
}
