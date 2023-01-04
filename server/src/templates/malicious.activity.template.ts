export const maliciousActivityTemplate = (
  recipient: string | string[],
  user: string
) => {
  return {
    from: '"REZA Info" <' + "rezafootwearcontact@gmail.com" + ">", // sender address
    to: recipient, // list of receivers
    subject: `Supspicous Activity for ${user} `, // Subject line
    text: `${user} has tried to use two different refresh tokens`, // plain text body
    html: `Hi, <br/>
          <br/>
          Someone has re-used a refresh token for: ${user}<br/>
          <br/>
            Check the activity to make sure everything seems correct
          <br/>
          `, // html body
  };
};
