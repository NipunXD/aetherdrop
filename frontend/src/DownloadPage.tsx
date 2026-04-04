import { useParams } from "react-router-dom";
import { motion } from "framer-motion";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function getApiBaseUrl() {
  const apiBaseUrlFromEnv = import.meta.env.VITE_API_BASE_URL;
  if (apiBaseUrlFromEnv) {
    return trimTrailingSlash(apiBaseUrlFromEnv);
  }

  const { protocol, hostname, port, origin } = window.location;
  const apiPort = port === "5173" ? "3001" : port;
  return trimTrailingSlash(
    apiPort ? `${protocol}//${hostname}:${apiPort}` : origin
  );
}

function DownloadPage() {
  const { id } = useParams();

  const handleDownload = () => {
    window.location.href = `${getApiBaseUrl()}/api/file/${id}`;
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 relative overflow-hidden">

      {/* Background glow */}
      <div className="absolute w-[500px] h-[500px] bg-blue-600/20 blur-3xl rounded-full top-[-100px] left-[-100px]" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 max-w-md w-full text-center shadow-xl"
      >
        {/* Logo / Title */}
        <h1 className="text-2xl font-semibold mb-2">
          AetherDrop
        </h1>

        {/* Main message */}
        <h2 className="text-lg font-medium mt-2 mb-2">
          Your files are ready
        </h2>

        <p className="text-gray-400 text-sm mb-6">
          Secure download • Auto-expiring • Limited access
        </p>

        {/* Download button */}
        <button
          onClick={handleDownload}
          className="w-full bg-blue-600 hover:bg-blue-700 transition p-3 rounded-xl font-medium"
        >
          Download ZIP
        </button>

        {/* Helper text */}
        <p className="text-xs text-gray-500 mt-4">
          This link will expire after a limited time or number of downloads.
        </p>

        {/* Footer branding */}
        <p className="text-[10px] text-gray-600 mt-6">
          Powered by AetherDrop
        </p>
      </motion.div>
    </div>
  );
}

export default DownloadPage;
