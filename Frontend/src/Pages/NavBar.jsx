import { MessageSquare, Settings, User2Icon } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { Link, useLocation } from "react-router-dom";
import NotificationCenter from "@/components/NotificationCenter";
import { useState } from "react";
const NavBar = () => {
  const { authUser } = useAuthStore();
  const location = useLocation();
  const [rotating, setRotating] = useState(false);

  const handleClick = () => {
    // Only animate if not on settings page
    if (location.pathname !== "/settings") {
      setRotating(true);
      setTimeout(() => setRotating(false), 500);
    }
  };

  return (
    <div className="navbar flex justify-between items-center p-4 font-work-sans fixed top-0 w-full z-10 border-b-2 border-gray-800 backdrop-blur-2xl bg-base-200">
      <div className="logo flex gap-3 items-center px-4">
        <Link to={"/"}>
          <MessageSquare className="text-blue-400" size="1.2rem" />
        </Link>
        <h3 className="text-[0.8rem]">Chat Square</h3>
      </div>
      <div className="settings flex items-center gap-3 pr-3">
        {/* Settings button available to everyone */}
        <Link to={"/settings"}>
          <button className="btn btn-danger btn-circle relative">
            <Settings 
              size="1rem" 
              className={`cursor-pointer transition-transform duration-500 ${
                rotating ? "rotate-[180deg]" : "rotate-0"
              }`}
              onClick={handleClick}
            />
          </button>
        </Link>
     {/* Notification button */}

{
  authUser && (
    <>
      <NotificationCenter size="1rem" />
    </>
  )
}
        {/* Profile button */}
        {authUser && (
          <>
              <Link to={"/profile"}>
                <button className="btn btn-danger btn-circle">
                  <User2Icon size="1rem"
                  className="cursor-pointer transition-transform duration-500" />
                </button>
              </Link>
            
          </>
        )}
      </div>
    </div>
  );
};

export default NavBar;