import React from 'react'
import { MessageSquare } from 'lucide-react'
const Logo = ({Title,Content}) => {
  return (
      <div className="text-center mt-14">
    <div className="flex flex-col items-center gap-2 group">
      <div
        className="size-12 rounded-xl bg-blue-500 flex items-center justify-center 
      group-hover:bg-blue-700 transition-colors"
      >
        <MessageSquare className="size-6 text-white" />
      </div>
      <h1 className="text-2xl font-bold mt-2 font-work-sans hidden sm:block">{Title}</h1>
      <p className="text-base-content/60 font-poppins hidden sm:block">{Content}</p>
   </div>
  </div>
  )
}

export default Logo