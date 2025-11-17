import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, CloseIcon } from './icons/Icons';

type NotificationType = 'success' | 'info' | 'error';

interface NotificationProps {
    id: number;
    message: string;
    type: NotificationType;
    onClose: (id: number) => void;
}

const icons: Record<NotificationType, React.ReactNode> = {
    success: <CheckCircleIcon className="h-6 w-6 text-green-500" />,
    error: <XCircleIcon className="h-6 w-6 text-red-500" />,
    info: <InformationCircleIcon className="h-6 w-6 text-blue-500" />,
};

const themeClasses: Record<NotificationType, { bg: string; border: string }> = {
    success: { bg: 'bg-green-50', border: 'border-green-400' },
    error: { bg: 'bg-red-50', border: 'border-red-400' },
    info: { bg: 'bg-blue-50', border: 'border-blue-400' },
};


const Notification: React.FC<NotificationProps> = ({ id, message, type, onClose }) => {
    const [isExiting, setIsExiting] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
      // Fade in
      setIsVisible(true);

      // Set timer to start fade out
      const exitTimer = setTimeout(() => {
          setIsExiting(true);
      }, 4500); // Start exit animation before removal

      // Set timer to fully remove the component
      const removeTimer = setTimeout(() => {
          onClose(id);
      }, 5000);

      return () => {
          clearTimeout(exitTimer);
          clearTimeout(removeTimer);
      };
    }, [id, onClose]);
    
    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => onClose(id), 300); 
    };

    const theme = themeClasses[type];

    return (
        <div
            className={`
                flex items-start p-4 w-full max-w-sm bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden border-l-4 ${theme.border}
                transition-all duration-300 ease-in-out
                ${isVisible && !isExiting ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}
            `}
        >
            <div className="flex-shrink-0">
                {icons[type]}
            </div>
            <div className="ml-3 w-0 flex-1 pt-0.5">
                <p className="text-sm font-medium text-gray-900">
                    {
                        { 'success': 'Succès', 'error': 'Erreur', 'info': 'Information' }[type]
                    }
                </p>
                <p className="mt-1 text-sm text-gray-600">
                    {message}
                </p>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
                <button
                    onClick={handleClose}
                    className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ipt-blue"
                >
                    <span className="sr-only">Close</span>
                    <CloseIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};

export default Notification;
