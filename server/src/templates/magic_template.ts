export const getMagicTemplate = (recipient: string, link: string) => {
    return {
      from: '"REZA Info" <' + "rezafootwearcontact@gmail.com" + ">", // sender address
      to: recipient, // list of receivers
      subject: `Welcome to the network`, // Subject line
      text: `${link} is your activation link for your REZA web session`, // plain text body
      html: `Hi, <br/>
          <br/>
          Your activation code to access your REZA web session is : ${link}<br/>
          <br/>
          Our team is at your service for any technical question. Do not hesitate to send your request to <a href="mailto:support@rezafootwear.com">support@rezafootwear.com</a><br/>
          <br/>
          Regards,<br/>
           <br/>
          REZA Team
          `, // html body
    };
  };
  