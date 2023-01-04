export const getTemplate = (recipient: string, code: string) => {
  return {
    from: '"REZA Info" <' + "rezafootwearcontact@gmail.com" + ">", // sender address
    to: recipient, // list of receivers
    subject: `${code} is your activation code for your REZA app session`, // Subject line
    text: `${code} is your activation code for your REZA app session`, // plain text body
    html: `Hi, <br/>
        <br/>
        Your activation code to access your REZA app session is : ${code}<br/>
        <br/>
        Our team is at your service for any technical question. Do not hesitate to send your request to <a href="mailto:support@rezafootwear.com">support@rezafootwear.com</a><br/>
        <br/>
        Regards,<br/>
         <br/>
        REZA Team
        `, // html body
  };
};
