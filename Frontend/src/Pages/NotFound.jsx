import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
    export default function NotFound() {
        return (
          <div className="flex min-h-screen flex-col items-center justify-center  text-white">
            <div className="container px-4 py-16 md:py-24 lg:py-32">
              <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-18
              items-center">
                {/* Illustration Side */}
                <div className="flex justify-center lg:justify-end">
                  <div className="relative w-64 h-64 md:w-80 md:h-80">
                    <img
                    //   illustration from https://storyset.com/
                      src="public/assets/error.svg" // Updated path to use the public folder
                      alt="404 Illustration"
                      fill
                      className="object-contain animate-wiggle animate-twice animate-ease-out"
                    />
                  </div>
                </div>
      
                {/* Content Side */}
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                  <h1 className="text-7xl font-bold tracking-tighter text-blue-500 mb-4 font-work-sans">404</h1>
      
                  <h2 className="text-3xl font-semibold mb-2 text-blue-300 font-poppins">Page Not Found</h2>
      
                  <p className="mb-8 text-sm text-gray-400 max-w-md font-poppins">
                    The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
                  </p>
      
                  <Link
                    to="/signup"
                    className="group flex items-center gap-2 rounded-full bg-blue-400 px-8 py-3 text-base font-medium text-white transition-all duration-300 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-700/20"
                  >
                    <ArrowLeft className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-1" />
                    <span className="font-work-sans">Back to Login</span>
                  </Link>
                </div>
              </div>
            </div>
      </div>
        )
      }
