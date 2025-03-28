import { User, Users, UserPlus, UserCheck, UserCog, UserCircle, MessageSquare, Heart, Bell } from "lucide-react";

const AuthImagePattern = ({ title, subtitle }) => {
    // Array of different user-related icons
    const icons = [
      <User className="text-white size-6" />,
      <Users className="text-white size-6" />,
     
    ];

    return (
      <div className="hidden lg:flex items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="grid grid-cols-3 gap-3 mt-4 mb-10">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className={`aspect-square rounded-2xl bg-blue-400 shadow-blue-500 ${
                  i % 2 === 0 ? "animate-pulse" : ""
                } flex items-center justify-center`}
              >
                {i % 2 === 0 && icons[i]}
              </div>
            ))}
          </div>
          <h2 className="text-2xl font-bold mb-4 font-work-sans text-white">{title}</h2>
          <p className="text-base-content/60 font-poppins">{subtitle}</p>
        </div>
      </div>
    );
  };
  
  export default AuthImagePattern;