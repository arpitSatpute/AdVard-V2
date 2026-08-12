import { CastPhoneWindow } from '../components/CastPhoneWindow';
import { Smartphone } from 'lucide-react';

export function CastWindow() {
  const searchParams = new URLSearchParams(window.location.search);
  const serial = searchParams.get('serial');


  if (!serial) {
    return (
      <div className="h-screen bg-[#090a0f] text-gray-400 flex flex-col items-center justify-center p-6 text-center text-xs gap-2">
        <Smartphone size={32} className="text-gray-600" />
        No device serial specified for screen casting window.
      </div>
    );
  }

  return <CastPhoneWindow serial={serial} isStandalone={true} />;
}
