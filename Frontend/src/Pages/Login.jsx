import Logo from "@/components/logo"
import { useState,useEffect } from "react"
import { useAuthStore } from "../store/useAuthStore";
import AuthImagePattern from "@/components/AuthImagePattern.jsx";
import { Loader2 } from "lucide-react";
import { Toaster } from "react-hot-toast";
import { LuEye } from "react-icons/lu";
import { LuEyeOff } from "react-icons/lu";
import { Link } from "react-router-dom";
const Login = () => {
  const { login,isLoggingin} = useAuthStore();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  function handleInputChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  
  }

  function handleSubmit(e) {
    e.preventDefault();
    console.log("Form submitted");
    login(formData);
  }

  const [mobile, setmobile] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <900) {
        setmobile(true);
      } else {
        setmobile(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [mobile]);
  console.log(formData);
  
  return (
    <>
     <Toaster
         position="top-right"
         hideProgressBar={false}
         closeOnClick
         pauseOnHover
         draggable
        toastOptions={{
          style: {
            background: '#333',
            color: '#fff',
          },
          success: {
            className: '!bg-blue-500 !text-white text-sm font-poppins',
            iconTheme: {
              primary: 'white',
              secondary: 'green',
            },
          },
          error: {
            className: '!bg-red-500 !text-white text-sm font-poppins',
            iconTheme: {
              primary: 'white',
              secondary: 'red',
            },
          },
        }}
      />
      <div className='grid grid-cols-1 lg:grid-cols-2 h-screen'>
        <div className="right flex w-full justify-center items-center flex-col gap-7">
          <Logo Title="Welcome Back!" Content="Sign in to your account"/> 
          <form className=" w-full flex justify-center items-center flex-col gap-5 lg:w-[80%] md:w-[80%]" onSubmit={handleSubmit}>
            <label className="input validator flex items-center gap-3 w-[60%]">
              <svg className="h-[1.1em] text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2.5" fill="none" stroke="currentColor"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></g></svg>
              <input type="email" 
                name="email"
                placeholder="mail@site.com" 
                required
                className=" text-primary font-poppins" 
                value={formData.email}
             
                onChange={handleInputChange}
              />
            </label>
            <label className="input validator flex items-center gap-3 w-[60%]">
              <img src="public/assets/key.svg" alt="key" className="h-[1em] opacity-50 invert-40" />
              <input 
                type={showPassword ? "text" : "password"} 
                required  
                name="password" 
                placeholder="Password"  
                minLength="6" 
                maxLength="30" 
                title="Only letters, numbers or dash" 
                className="text-primary font-poppins h-[1rem]" 
                value={formData.password}
                onChange={handleInputChange}
              />
              {
                showPassword? (
                  <LuEyeOff className="cursor-pointer" onClick={()=>setShowPassword(!showPassword)} size="1rem" /> 
                ) : (
                  <LuEye className="cursor-pointer" onClick={()=>setShowPassword(!showPassword)} size="1rem" /> 
                )
              }

            </label>
            
            <div className="validator-hint hidden">Enter valid email address</div>
            <button type="submit" className="btn btn-info w-[60%] mt-3" disabled={isLoggingin}>
              {isLoggingin ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Loading...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
          <p className="text-center font-work-sans text-sm text-gray-500">
            Don't have an account? <Link to="/signup" className="text-blue-500  hover:underline">Sign up</Link>
          </p>
        </div>
        <div className={!mobile?"flex w-full p-5 mt-7":"hidden"}>
          <AuthImagePattern
            title="Join  community"
            subtitle="Connect with friends, share moments, and stay in touch with your loved ones."
          />
        </div>
      </div>
    </>
  )
}

export default Login