import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-base-200 pt-20 pb-10 px-4 sm:px-6 lg:px-8 font-work-sans">
      <div className="max-w-4xl mx-auto bg-base-100 p-6 sm:p-10 rounded-lg shadow-md"> {/* Increased padding */}
        <Link
          to={-1}
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-8" // Increased bottom margin
        >
          <ArrowLeft size={16} />
          Back
        </Link>

        <h1 className="text-3xl font-bold mb-4 text-base-content">Privacy Policy</h1> {/* Reduced bottom margin */}

        {/* Use prose for base styling, but add custom spacing */}
        <div className="prose max-w-none text-base-content/90">
          <p className="text-sm mb-6"><strong>Last Updated: 12 April 2025</strong></p> {/* Increased bottom margin */}

          <p className="mb-4 italic">Please note: Chatty is a personal hobby project developed by an individual who is still learning. While I strive to follow best practices, this application may not have the same level of robustness or security as commercial products.</p>

          <p className="mb-4">Welcome to Chatty! I am committed to protecting your personal information and your right to privacy. If you have any questions or concerns about this privacy notice, or my practices with regards to your personal information, please contact me at <a href="mailto:ak.cllases@gmail.com" className="text-primary hover:underline">ak.cllases@gmail.com</a>.</p>

          <h2 className="mt-8 mb-4">1. INFORMATION I COLLECT</h2> {/* Added top margin */}
          <p className="mb-4">I collect personal information that you voluntarily provide to me when you register on Chatty, express an interest in obtaining information about me or my products and Services, when you participate in activities on Chatty or otherwise when you contact me.</p>
          <p className="mb-4">The personal information that I collect depends on the context of your interactions with me and Chatty, the choices you make and the products and features you use. The personal information I collect may include the following:</p>
          <ul className="list-disc pl-5 space-y-2 mb-4"> {/* Added list styling and spacing */}
            <li><strong>Personal Information Provided by You:</strong> I collect your full name, email address, password (stored securely using hashing), username (derived from email or name), profile picture (optional), and user description (optional).</li>
            <li><strong>Messages:</strong> I collect and store the content of messages you send and receive through the Service, including private and global chats, to provide the chat functionality and history.</li>
            <li><strong>Usage Data:</strong> I may automatically collect general usage data when you access and use the Service. This may include information such as browser type, browser version, the pages of my Service that You visit, the time and date of Your visit, and the time spent on those pages. I do not store your IP address persistently with your user data.</li>
            <li><strong>Online Status & Activity:</strong> I track your online status (based on socket connection) and your last seen time to display to other users. I also store information about users you have blocked.</li>
            <li><strong>Notifications:</strong> I store notification details (sender, receiver, message snippet, read/delivered status) to manage in-app and push notifications. Push notification subscription details (endpoint, keys) provided by your browser are stored if you opt-in.</li>
            <li><strong>Verification Data:</strong> If email verification is used, I temporarily store verification codes (OTPs) linked to your email address until they expire or are used.</li>
          </ul>

          <h2 className="mt-8 mb-4">2. HOW I USE YOUR INFORMATION</h2> {/* Added top margin */}
          <p className="mb-4">I use personal information collected via Chatty for a variety of business purposes described below. I process your personal information for these purposes in reliance on my legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with my legal obligations. I indicate the specific processing grounds I rely on next to each purpose listed below.</p>
          <p className="mb-2">I use the information I collect or receive:</p> {/* Reduced bottom margin */}
          <ul className="list-disc pl-5 space-y-2 mb-4"> {/* Added list styling and spacing */}
            <li>To facilitate account creation and logon process.</li>
            <li>To post testimonials (with your consent).</li>
            <li>Request feedback.</li>
            <li>To enable user-to-user communications.</li>
            <li>To manage user accounts.</li>
            <li>To send administrative information to you.</li>
            <li>To protect my Services.</li>
            <li>To enforce my terms, conditions and policies for business purposes, to comply with legal and regulatory requirements or in connection with my contract.</li>
            <li>To respond to legal requests and prevent harm.</li>
            <li>To deliver and facilitate delivery of services to the user.</li>
            <li>To respond to user inquiries/offer support to users.</li>
            <li>For other Business Purposes, such as data analysis, identifying usage trends, determining the effectiveness of promotional campaigns and to evaluate and improve my Services, products, marketing and your experience.</li>
          </ul>

          <h2 className="mt-8 mb-4">3. WILL YOUR INFORMATION BE SHARED WITH ANYONE?</h2> {/* Added top margin */}
          <p className="mb-4">I only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations.</p>
          <p className="mb-2">Specifically, I may need to process your data or share your personal information in the following situations:</p> {/* Reduced bottom margin */}
          <ul className="list-disc pl-5 space-y-2 mb-4"> {/* Added list styling and spacing */}
            <li>Business Transfers.</li>
            <li>When I use Google Analytics.</li>
            <li>With other Users (when you interact in public or private chats).</li>
            <li>Legal Obligations.</li>
          </ul>

          <h2 className="mt-8 mb-4">4. HOW LONG DO I KEEP YOUR INFORMATION?</h2> {/* Added top margin */}
          <p className="mb-4">I will only keep your personal information for as long as it is necessary for the purposes set out in this privacy notice, unless a longer retention period is required or permitted by law (such as tax, accounting or other legal requirements). Generally, this means I keep your account information and message history while your account is active. Temporary data like OTPs are deleted automatically after a short period (e.g., 10 minutes).</p> {/* Updated retention details */}

          <h2 className="mt-8 mb-4">5. HOW DO I KEEP YOUR INFORMATION SAFE?</h2> {/* Added top margin */}
          <p className="mb-4">I have implemented appropriate technical and organizational security measures designed to protect the security of any personal information I process. However, despite my safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure, so I cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat my security, and improperly collect, access, steal, or modify your information.</p>

          <h2 className="mt-8 mb-4">6. DO I COLLECT INFORMATION FROM MINORS?</h2> {/* Added top margin */}
          <p className="mb-4">I do not knowingly solicit data from or market to children under 13 years of age. By using Chatty, you represent that you are at least 13 or that you are the parent or guardian of such a minor and consent to such minor dependent’s use of Chatty.</p>

          <h2 className="mt-8 mb-4">7. WHAT ARE YOUR PRIVACY RIGHTS?</h2> {/* Added top margin */}
          <p className="mb-4">In some regions (like the EEA and UK), you have certain rights under applicable data protection laws. These may include the right (i) to request access and obtain a copy of your personal information, (ii) to request rectification or erasure; (iii) to restrict the processing of your personal information; and (iv) if applicable, to data portability. In certain circumstances, you may also have the right to object to the processing of your personal information.</p>
          <p className="mb-4">If you are resident in the European Economic Area and you believe I am unlawfully processing your personal information, you also have the right to complain to your local data protection supervisory authority.</p>

          <h2 className="mt-8 mb-4">8. CONTROLS FOR DO-NOT-TRACK FEATURES</h2> {/* Added top margin */}
          <p className="mb-4">Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track ("DNT") feature or setting you can activate to signal your privacy preference not to have data about your online browsing activities monitored and collected. At this stage no uniform technology standard for recognizing and implementing DNT signals has been finalized. As such, I do not currently respond to DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked online.</p>

          <h2 className="mt-8 mb-4">9. UPDATES TO THIS NOTICE</h2> {/* Added top margin */}
          <p className="mb-4">I may update this privacy notice from time to time. The updated version will be indicated by an updated "Revised" date and the updated version will be effective as soon as it is accessible. I encourage you to review this privacy notice frequently to be informed of how I am protecting your information.</p>

          <h2 className="mt-8 mb-4">10. HOW CAN YOU CONTACT ME ABOUT THIS NOTICE?</h2> {/* Added top margin */}
          <p>If you have questions or comments about this notice, you may email me at <a href="mailto:ak.cllases@gmail.com" className="text-primary hover:underline">ak.cllases@gmail.com</a>.</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
