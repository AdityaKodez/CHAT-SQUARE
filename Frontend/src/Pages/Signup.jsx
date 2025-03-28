import { useAuthStore } from "@/store/useAuthStore";
  import { useEffect, useState, useCallback } from "react"
  import { Link} from "react-router-dom";
  import { Loader2 } from "lucide-react";
  import AuthImagePattern from "../components/AuthImagePattern.jsx";
  import toast, { Toaster } from "react-hot-toast"; // Add the Toaster import here
  import axiosInstance from "../lib/axios.js"
  import { MdOutlineEmail } from "react-icons/md";
  
  import Logo from "@/components/logo.jsx";
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
  
  const Signup = () => {
    const[mobile,setmobile] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const[closedEye,setclosedeye] = useState(false);
    const{isSigningIn,signup} = useAuthStore();
    const [formData, setFormData] = useState({
      fullName: "",
      email: "",
      password: "",
    });
    const [emailStatus, setEmailStatus] = useState({
      checking: false,
      available: true,
      message: ''
    });
// console.log(formData) checking.....
// copied from the tutorial 
  const validateForm = () => {
    if (!formData.fullName.trim()) return toast.error("Full name is required");
    if (!formData.email.trim()) return toast.error("Email is required");
    if (!/\S+@\S+\.\S+/.test(formData.email)) return toast.error("Invalid email format");
    if (!emailStatus.available) return toast.error("Email already registered");
    if (!formData.password) return toast.error("Password is required");
    if (formData.password.length < 6) return toast.error("Password must be at least 6 characters");

    return true;
  };
  function HandleEye(){
    setclosedeye(!closedEye)
    setShowPassword(!showPassword)
  }
 
  
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

    // Update the checkEmailAvailability function
const checkEmailAvailability = useCallback(
  debounce(async (email) => {
    if (!email || !email.includes('@')) {
      setEmailStatus({ checking: false, available: false, message: '' });
      return;
    }
    
    try {
      setEmailStatus({ checking: true, available: false, message: 'Checking...' });
      
      const response = await axiosInstance.get(`/auth/check-email?email=${encodeURIComponent(email)}`);
      
      setEmailStatus({
        checking: false,
        available: !response.data.exists,
        message: response.data.message
      });
    } catch (error) {
      setEmailStatus({ 
        checking: false, 
        available: false, 
        message: error.response?.data?.message || 'Email verification failed' 
      });
    }
  }, 500),
  [] 
);

// Update handleSubmit to handle email validation properly
function HandleSubmit(e) {
  e.preventDefault();
    
  // Prevent submission while email check is in progress
  if (emailStatus.checking) {
    toast.loading("Please wait while we verify email availability...");
    return;
  }
  
  // Prevent submission if email is taken
  if (!emailStatus.available && formData.email) {
    toast.error("Please use a different email address");
    return;
  }
  
  const success = validateForm();
  if (success === true) signup(formData);
}

    const handleEmailChange = (e) => {
      const email = e.target.value;
      setFormData({ ...formData, email });
      
      if (email) {
        checkEmailAvailability(email);
      } else {
        setEmailStatus({ checking: false, available: true, message: '' });
      }
    };

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
            className: '!bg-green-500 !text-white text-sm font-poppins',
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
      <div className="grid grid-cols-1 lg:grid-cols-2 h-screen w-full">
      <div className="right flex justify-center flex-col items-center w-full gap-4">
        {/* logo */}
     <Logo Title="Create Account"
     Content="Get started with your free account"/>
<form onSubmit={HandleSubmit}>
  <div className="flex justify-center items-center w-full flex-col gap-4 p-5">

  <label className="input validator">

    <svg className="h-[1.1em] text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2.5" fill="none" stroke="currentColor"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4">
      </circle>
      </g>
      </svg>

    <input type="input" 
     required 
     placeholder="Full Name"
      maxLength="30"
     title="Enter your full name" 
     className=" font-poppins text-primary"
     value={formData.fullName} 
     onChange={(e)=>setFormData({...formData,fullName:e.target.value})}/>
  </label>

  <label className="input validator">
  <img src="public/assets/key.svg" alt="key" className="h-[1em] opacity-100 invert-50" />

    <input 
      type={showPassword ? "text" : "password"} 
      required 
      placeholder="Password"  
      minLength="6" 
      maxLength="30" 
      title="Only letters, numbers or dash" 
      className=" font-poppins text-primary" 
      value={formData.password}
      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
    />
 
  </label>
  <label className="input validator flex justify-between items-center">
   <MdOutlineEmail className="text-primary"/>
    <input 
      type="email" 
      placeholder="mail@site.com"
      className={`h-[1em] font-poppins text-primary ${
        !emailStatus.available && formData.email ? 'border-red-500' : ''
      }`}
      required
      value={formData.email}
      onChange={handleEmailChange}
    />
  </label>

  {/* Email status message */}
  {formData.email && (
    <div className="text-xs mt-1">
      {emailStatus.checking ? (
        <span className="text-blue-400 font-poppins text-left">Checking availability...</span>
      ) : emailStatus.message ? (
        <span className={`${emailStatus.available ? "text-green-400" : "text-red-400"} font-poppins text-left`}>
          {emailStatus.message}
        </span>
      ) : null}
    </div>
  )}

  <button type="submit" className="btn btn-info w-full" disabled={isSigningIn}>
              {isSigningIn ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Loading...
                </>
              ) : (
                "Create Account"
              )}
            </button>
            <div className="flex gap-3">
              <div>
              <p className="font-work-sans opacity-55">  Already have an account?{""}</p>
              </div>
            
              <Link to="/login" className="link text-blue-400 no-underline font-work-sans hover:underline">
                Sign in
              </Link>
           
          </div>
  </div>
  </form>

      </div>
      <div className={!mobile ? "flex w-full items-center justify-center mt-4":"hidden"}>
      <AuthImagePattern
        title="Join our community"
        subtitle="Connect with friends, share moments, and stay in touch with your loved ones."
      />
    
      </div>
   
      </div>
      </>
    )
  }

export default Signup