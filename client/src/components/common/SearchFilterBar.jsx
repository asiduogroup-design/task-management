const SearchFilterBar = ({ search, setSearch, searchId = 'workspace-search', searchName = 'workspaceSearch', children }) => (
  <div className="mb-4 flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
    <input
      className="form-field md:max-w-sm"
      id={searchId}
      name={searchName}
      placeholder="Search..."
      value={search}
      onChange={(event) => setSearch(event.target.value)}
    />
    <div className="flex flex-1 flex-wrap gap-3">{children}</div>
  </div>
);

export default SearchFilterBar;
