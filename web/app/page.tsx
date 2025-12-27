export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Permission Session
        </h1>
        <p className="text-gray-600 mb-8">
          This application is used to capture data from your device.
          Please use a valid session link from Telegram to proceed.
        </p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            ⚠️ You need a valid session token to use this application.
            Please get a link from the Telegram bot.
          </p>
        </div>
      </div>
    </main>
  );
}
