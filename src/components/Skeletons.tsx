export const CardSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
    <div className="w-full h-48 bg-gray-300"></div>
    <div className="p-4">
      <div className="h-6 bg-gray-300 rounded mb-2"></div>
      <div className="h-4 bg-gray-200 rounded mb-4 w-3/4"></div>
      <div className="flex space-x-2">
        <div className="flex-1 h-9 bg-gray-200 rounded"></div>
        <div className="flex-1 h-9 bg-gray-200 rounded"></div>
      </div>
    </div>
  </div>
);

export const TableRowSkeleton = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-32"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-20"></div>
    </td>
    <td className="px-6 py-4">
      <div className="flex space-x-3">
        <div className="h-5 w-5 bg-gray-200 rounded"></div>
        <div className="h-5 w-5 bg-gray-200 rounded"></div>
      </div>
    </td>
  </tr>
);

export const StatCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow p-6 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
        <div className="h-8 bg-gray-300 rounded w-16"></div>
      </div>
      <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
    </div>
  </div>
);

export const FormSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div>
      <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
    </div>
    <div>
      <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
    </div>
    <div>
      <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
    </div>
    <div className="flex justify-end space-x-3 pt-4">
      <div className="h-10 w-20 bg-gray-200 rounded"></div>
      <div className="h-10 w-32 bg-gray-300 rounded"></div>
    </div>
  </div>
);

export const CompanyCardsGridSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="bg-white rounded-lg shadow overflow-hidden">
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3">
              <div className="h-4 bg-gray-300 rounded w-24"></div>
            </th>
            <th className="px-6 py-3">
              <div className="h-4 bg-gray-300 rounded w-20"></div>
            </th>
            <th className="px-6 py-3">
              <div className="h-4 bg-gray-300 rounded w-20"></div>
            </th>
            <th className="px-6 py-3">
              <div className="h-4 bg-gray-300 rounded w-16"></div>
            </th>
            <th className="px-6 py-3">
              <div className="h-4 bg-gray-300 rounded w-16"></div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} />
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
