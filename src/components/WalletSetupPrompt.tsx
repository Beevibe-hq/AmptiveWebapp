import { useNavigate } from 'react-router-dom';

type WalletSetupPromptProps = {
  /** The grey lead-in before "Set up your wallet.", saying what the wallet is for here. */
  reason: string;
};

/*
 * Full-screen stop for a feature that pays out to a wallet the user doesn't have yet.
 * Sends them to wallet setup on Finance with returnTo, so they come straight back here.
 */
export default function WalletSetupPrompt({ reason }: WalletSetupPromptProps) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-100/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] w-full max-w-[440px] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.08)] animate-in zoom-in-95 duration-200 flex flex-col items-center text-center">

        <div className="mb-8">
          <img
            src="/images/finance/wallet-setup-illustration.svg"
            alt="Wallet Setup"
            className="mx-auto h-[120px] w-auto object-contain"
          />
        </div>

        <h2 className="text-[28px] leading-[1.2] tracking-tight mb-8">
          <span className="text-gray-500 font-medium">{reason} </span>
          <span className="text-black font-bold">Set up your wallet.</span>
        </h2>

        <button
          onClick={() => {
            const returnTo = `${window.location.pathname}${window.location.search}`;
            navigate(`/dashboard/finance?setupWallet=1&returnTo=${encodeURIComponent(returnTo)}`);
          }}
          className="w-full flex items-center justify-center gap-2 rounded-full bg-black px-6 py-4 text-[15px] font-bold text-white hover:bg-gray-800 transition-all hover:scale-[1.02] active:scale-[0.98] mb-6"
        >
          <svg width="24" height="24" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M27.5 19.7727C27.5 22.9107 24.9562 25.4545 21.8182 25.4545H8.18182C5.04384 25.4545 2.5 22.9107 2.5 19.7727V10.6818C2.5 7.54384 5.04384 5 8.18182 5H21.8182C24.9562 5 27.5 7.54384 27.5 10.6818V19.7727ZM8.18182 7.03409H21.8182C23.8328 7.03409 25.4659 8.66723 25.4659 10.6818V11.8182H21.8182C19.9354 11.8182 18.4091 13.3445 18.4091 15.2273C18.4091 17.1101 19.9354 18.6364 21.8182 18.6364H25.4659V19.7727C25.4659 21.7873 23.8328 23.4205 21.8182 23.4205H8.18182C6.16723 23.4205 4.53409 21.7873 4.53409 19.7727V10.6818C4.53409 8.66723 6.16723 7.03409 8.18182 7.03409ZM25.4659 16.6023V13.8523H21.8182C21.0588 13.8523 20.4432 14.4679 20.4432 15.2273C20.4432 15.9867 21.0588 16.6023 21.8182 16.6023H25.4659Z" fill="white"/>
          </svg>
          Set up Wallet
        </button>

        <p className="text-[11px] text-gray-400 leading-relaxed px-4">
          By clicking "Set up Wallet", you will set up your wallet on the finance dashboard and come straight back here. Or you can <button onClick={() => navigate(-1)} className="underline hover:text-gray-600 transition-colors">Go back</button>.
        </p>

      </div>
    </div>
  );
}
