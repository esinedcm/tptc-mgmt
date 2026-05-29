const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.emailTemplate.update({
  where: { id: 'INTEREST_CONFIRMATION' },
  data: {
    htmlBody: `<div style="color:black;">
<h3>Hello, {{firstName}},</h3>
<br />
<p>
We received notification of your interest in {{clubName}}.
<br />
Here's a bunch of information about the club:
<ul>
<li></li>
<li></li>
</ul>

We hope you'll join us. <br /> Click <a href="{{registerLink}}">here</a> to register.
</p>
</div>`
  }
}).then(res => console.log('Fixed!')).finally(() => prisma.$disconnect());
