import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerSupabase } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { emails, groupId, groupName, role, inviterName } = await req.json();

    const results = [];
    
    for (const email of emails) {
      const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/join?group=${groupId}&email=${encodeURIComponent(email)}&role=${role}&groupName=${encodeURIComponent(groupName)}`;
      
      const { data, error } = await resend.emails.send({
        from: "KoloAI <noreply@kidsstudiocode.com.ng>",
        to: [email],
        subject: `${inviterName} invited you to join ${groupName} on KoloAI`,
        html: `
          <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8f9ff;">
            <div style="background-color: #0b1c30; padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: #62df7d; margin: 0; font-size: 28px;">KoloAI</h1>
              <p style="color: #eaf1ff; margin-top: 8px; font-size: 14px;">AI-Powered Community Wealth</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 40px 30px; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 16px 16px;">
              <h2 style="color: #0b1c30; font-size: 24px; margin-bottom: 16px;">You have been invited</h2>
              
              <p style="color: #3e4a3d; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                <strong style="color: #006b2c;">${inviterName}</strong> has invited you to join <strong>${groupName}</strong> as a <span style="color: #00873a; font-weight: 600; text-transform: capitalize;">${role}</span>.
              </p>
              
              <div style="background-color: #eff4ff; padding: 20px; border-radius: 12px; margin-bottom: 32px;">
                <p style="color: #3e4a3d; font-size: 14px; margin: 0 0 8px 0;"><strong>Group Details:</strong></p>
                <p style="color: #3e4a3d; font-size: 14px; margin: 4px 0;">Group: <strong>${groupName}</strong></p>
                <p style="color: "#3e4a3d"; font-size: 14px; margin: 4px 0;">Role: <strong style="text-transform: capitalize;">${role}</strong></p>
                <p style="color: "#3e4a3d"; font-size: 14px; margin: 4px 0;">Invited by: <strong>${inviterName}</strong></p>
              </div>
              
              <a href="${inviteLink}" style="display: block; background-color: #006b2c; color: #ffffff; text-align: center; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; margin-bottom: 24px;">
                Accept Invitation
              </a>
              
              <p style="color: #6e7b6c; font-size: 12px; text-align: center;">
                Or copy this link: <br/>
                <span style="color: #006b2c;">${inviteLink}</span>
              </p>
            </div>
            
            <p style="color: #6e7b6c; font-size: 11px; text-align: center; margin-top: 16px;">
              Powered by Monnify | Secure and Encrypted
            </p>
          </div>
        `,
      });

      if (error) {
        results.push({ email, success: false, error: error.message });
      } else {
        results.push({ email, success: true, id: data?.id });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json({ error: "Failed to send invites" }, { status: 500 });
  }
}





// import { NextRequest, NextResponse } from "next/server";
// import { Resend } from "resend";
// import { createServerSupabase } from "@/lib/supabase/server";

// const resend = new Resend(process.env.RESEND_API_KEY);

// export async function POST(req: NextRequest) {
//   try {
//     const supabase = await createServerSupabase();
//     const { data: { user } } = await supabase.auth.getUser();
    
//     if (!user) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const { emails, groupId, groupName, role, inviterName } = await req.json();

//     const results = [];
    
//     for (const email of emails) {
//         const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/join?group=${groupId}&email=${encodeURIComponent(email)}&role=${role}&groupName=${encodeURIComponent(groupName)}`;
//     //   const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/join?group=${groupId}&email=${encodeURIComponent(email)}&role=${role}`;
      
//       const { data, error } = await resend.emails.send({
//         from: "Kolo AI <onboarding@resend.dev>", // Use your verified domain in production
//         to: [email],
//         subject: `${inviterName} invited you to join ${groupName} on Kolo AI`,
//         html: `
//           <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8f9ff;">
//             <div style="background-color: #0b1c30; padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
//               <h1 style="color: #62df7d; margin: 0; font-size: 28px;">Kolo AI</h1>
//               <p style="color: #eaf1ff; margin-top: 8px; font-size: 14px;">AI-Powered Community Wealth</p>
//             </div>
            
//             <div style="background-color: #ffffff; padding: 40px 30px; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 16px 16px;">
//               <h2 style="color: #0b1c30; font-size: 24px; margin-bottom: 16px;">You've been invited! 🎉</h2>
              
//               <p style="color: #3e4a3d; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
//                 <strong style="color: #006b2c;">${inviterName}</strong> has invited you to join <strong>${groupName}</strong> as a <span style="color: #00873a; font-weight: 600; text-transform: capitalize;">${role}</span>.
//               </p>
              
//               <div style="background-color: #eff4ff; padding: 20px; border-radius: 12px; margin-bottom: 32px;">
//                 <p style="color: #3e4a3d; font-size: 14px; margin: 0 0 8px 0;">📋 <strong>Group Details:</strong></p>
//                 <p style="color: #3e4a3d; font-size: 14px; margin: 4px 0;">• Group: <strong>${groupName}</strong></p>
//                 <p style="color: #3e4a3d; font-size: 14px; margin: 4px 0;">• Role: <strong style="text-transform: capitalize;">${role}</strong></p>
//                 <p style="color: #3e4a3d; font-size: 14px; margin: 4px 0;">• Invited by: <strong>${inviterName}</strong></p>
//               </div>
              
//               <a href="${inviteLink}" style="display: block; background-color: #006b2c; color: #ffffff; text-align: center; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; margin-bottom: 24px;">
//                 Accept Invitation →
//               </a>
              
//               <p style="color: #6e7b6c; font-size: 12px; text-align: center;">
//                 Or copy this link: <br/>
//                 <span style="color: #006b2c;">${inviteLink}</span>
//               </p>
//             </div>
            
//             <p style="color: #6e7b6c; font-size: 11px; text-align: center; margin-top: 16px;">
//               Powered by Monnify • Secure & Encrypted
//             </p>
//           </div>
//         `,
//       });

//       if (error) {
//         results.push({ email, success: false, error: error.message });
//       } else {
//         results.push({ email, success: true, id: data?.id });
//       }
//     }

//     return NextResponse.json({ success: true, results });
//   } catch (error) {
//     console.error("Invite error:", error);
//     return NextResponse.json({ error: "Failed to send invites" }, { status: 500 });
//   }
// }
