// import React from 'react';
// import { HashRouter, Routes, Route } from 'react-router-dom';
// import NotificationWidget from './NotificationWidget';
//
// export default function App() {
//     return (
//         <HashRouter>
//             <Routes>
//                 <Route path="/widget" element={<NotificationWidget />} />
//                 <Route path="*"       element={<NotificationWidget />} />
//             </Routes>
//         </HashRouter>
//     );
// }

import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import NotificationWidget from './NotificationWidget';

function BossOnlyWidget() {
    const [isReady, setIsReady] = React.useState(false);
    const [isBoss,  setIsBoss]  = React.useState(false);

    React.useEffect(() => {
        // ✅ Poll localStorage until user is injected by Electron main process
        const check = setInterval(() => {
            const stored = localStorage.getItem("user");
            if (stored) {
                const user = JSON.parse(stored);
                setIsBoss(user?.role === "BOSS");
                setIsReady(true);
                clearInterval(check);
            }
        }, 500);

        // Stop polling after 10 seconds
        setTimeout(() => clearInterval(check), 10000);

        return () => clearInterval(check);
    }, []);

    if (!isReady) return null;   // waiting for localStorage injection
    if (!isBoss)  return null;   // not BOSS — show nothing

    return <NotificationWidget />;
}

export default function App() {
    return (
        <HashRouter>
            <Routes>
                <Route path="*" element={<BossOnlyWidget />} />
            </Routes>
        </HashRouter>
    );
}