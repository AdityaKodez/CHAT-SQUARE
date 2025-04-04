import { MessageSquare, Settings, User2Icon } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { Link, useLocation } from "react-router-dom";
import NotificationCenter from "@/components/NotificationCenter";

const NavBar = () => {
  const { authUser } = useAuthStore();
  const location = useLocation();

  return (
    <div className="navbar flex justify-between items-center p-4 font-work-sans fixed top-0 w-full z-10 border-b-2 border-gray-800 backdrop-blur-2xl bg-base-200">
      <div className="logo flex gap-3 items-center px-4">
        <Link to={"/"}>
          <MessageSquare className="text-blue-400" size="1.2rem" />
        </Link>
        <h3 className="text-[0.8rem]">Chat Square</h3>
      </div>
      <div className="settings flex items-center gap-3 pr-3">
        {authUser && (
          <>
           
       
            
            {location.pathname !== "/profile" && (
              <Link to={"/profile"}>
                <button className="btn btn-sm btn-soft btn-info">
                  <User2Icon size="1rem" />
                  Profile
                </button>
              </Link>
            )}
          </>
        )}
        
        {/* Settings button available to everyone */}
        <Link to={"/settings"}>
          <button className="btn btn-sm btn-soft btn-info">
            <Settings size="1rem" />
            Settings
          </button>
        </Link>
        <NotificationCenter size="1rem" />
      </div>
    </div>
  );
};

export default NavBar;