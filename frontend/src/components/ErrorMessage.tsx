interface ErrorMessageProps {
  message: string;
}

const ErrorMessage = ({ message }: ErrorMessageProps) => {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 max-w-md">
        <div className="flex items-center mb-4">
          <svg className="w-6 h-6 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-red-400">Error</h3>
        </div>
        <p className="text-gray-300">{message}</p>
      </div>
    </div>
  );
};

export default ErrorMessage;
