import nodemailer from 'nodemailer'

const mailSender = async (email,title,body) => {
    try {
        let transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: process.env.MAIL_PORT,
            auth: {
                user: process.env.MAIL_USERNAME,
                pass: process.env.MAIL_PASSWORD
            }
        })

        //send email to user
        let info = await transporter.sendMail({
            from: process.env.MAIL_FROM_EMAIL,
            to: email,
            subject: title,
            html: body
        })
        console.log('Email info: ',info)
        return info
    } catch (error) {
        console.error(error)
        throw new Error(error)
    }
}

export default mailSender