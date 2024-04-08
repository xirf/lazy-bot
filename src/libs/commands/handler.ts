import Message from "../whatsapp/message";

async function handler(message: Message) {
    try {
        console.log(message);
    } catch (error) {
        console.error(error);
    }
}

export default handler;