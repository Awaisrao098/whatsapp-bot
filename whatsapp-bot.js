const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mysql = require('mysql2');

const app = express();
const server = http.createServer(app); // Create HTTP server
const io = socketIO(server);          // Initialize Socket.IO

const client = new Client({
    authStrategy: new LocalAuth()
});

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // replace with your DB username
    password: '', // replace with your DB password
    database: 'customer_agent_system',
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.message);
        return;
    }
    console.log('Connected to the database.');
});





// QR Code event
client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    io.emit('qr', qr); // Emit QR code to the frontend
});

// Ready event
client.on('ready', () => {
    console.log('WhatsApp is ready!');
    io.emit('ready');
});

// State tracking for users
const userStates = {};

// Handle incoming messages
client.on('message', async (msg) => {
    const user = msg.from;
    const message = msg.body;

    // Log the message to the database
    db.query(
        'INSERT INTO conversation_logs (user, message) VALUES (?, ?)',
        [user, message],
        (err) => {
            if (err) {
                console.error('Error saving message to database:', err.message);
            }
        }
    );

    // Emit the message to connected clients (e.g., conversation.php)
    io.emit('new_message', { user, message, timestamp: new Date().toISOString() });

    // Existing functionality (maintain user state and menu handling)
    if (!userStates[user]) {
        userStates[user] = { menu: 'main' }; // Initialize user state
    }


    const userState = userStates[user];

    // Main Menu
    if (userState.menu === 'main') {
        const menu = `
Welcome to our service! Please choose an option:
1️⃣ Umrah
2️⃣ Visa
3️⃣ Live Ticketing
4️⃣ Request a Call
0️⃣ Back to Main Menu
        `;
        client.sendMessage(msg.from, menu);
        userState.menu = 'awaiting_main_response';
    } 
    // Main Menu Selection
    else if (userState.menu === 'awaiting_main_response') {
        if (msg.body === '1') {
            const umrahMenu = `
You selected Umrah. Please choose a package:
1️⃣ 7 Days
2️⃣ 15 Days
3️⃣ 21 Days
4️⃣ 28 Days
0️⃣ Back to Main Menu
            `;
            client.sendMessage(msg.from, umrahMenu);
            userState.menu = 'umrah_packages';
        } else if (msg.body === '2') {
            const visaMenu = `
You selected Visa. Please choose a country:
1️⃣ Azerbaijan
2️⃣ Indonesia
3️⃣ Sri Lanka
4️⃣ Malaysia
5️⃣ Thailand
6️⃣ Singapore
0️⃣ Back to Main Menu
            `;
            client.sendMessage(msg.from, visaMenu);
            userState.menu = 'visa_selection';
        } else if (msg.body === '3') {
            const liveTicketingForm = `
You selected Live Ticketing. Please provide the following details:
- Name:
- Number:
- Sector From:
- Destination:
- Dates:
0️⃣ Back to Main Menu
            `;
            client.sendMessage(msg.from, liveTicketingForm);
            userState.menu = 'live_ticketing';
        } else if (msg.body === '4') {
            const requestCallForm = `
You selected Request a Call. Please provide the following details:
- Name:
- Number:
- Note: If you require urgent assistance, call or WhatsApp us at 03111150777. If not urgent, our team will call you soon.
0️⃣ Back to Main Menu
            `;
            client.sendMessage(msg.from, requestCallForm);
            userState.menu = 'request_call';
        } else if (msg.body === '0') {
            // Go back to the main menu if the user selects 0
            const mainMenu = `
You are now back to the Main Menu. Please select an option:
1️⃣ Umrah
2️⃣ Visa
3️⃣ Live Ticketing
4️⃣ Request a Call
            `;
            client.sendMessage(msg.from, mainMenu);
            userState.menu = 'awaiting_main_response';
        } else {
            client.sendMessage(msg.from, 'Invalid option. Please type "hi" to start again.');
            userState.menu = 'main';
        }
    } 
    // Umrah Packages
    // Umrah Packages
else if (userState.menu === 'umrah_packages') {
    if (msg.body === '1' || msg.body === '2' || msg.body === '3' || msg.body === '4') {
        const umrahRoutes = `
You selected ${msg.body === '1' ? '7 Days' : msg.body === '2' ? '15 Days' : msg.body === '3' ? '21 Days' : '28 Days'} Umrah. Choose your route:
1️⃣ Karachi to Jeddah
2️⃣ Multan to Jeddah
3️⃣ Custom Package
0️⃣ Back to Main Menu
        `;
        client.sendMessage(msg.from, umrahRoutes);
        userState.menu = 'umrah_routes';
    } else if (msg.body === '0') {
        const mainMenu = `
You are now back to the Main Menu. Please select an option:
1️⃣ Umrah
2️⃣ Visa
3️⃣ Live Ticketing
4️⃣ Request a Call
        `;
        client.sendMessage(msg.from, mainMenu);
        userState.menu = 'awaiting_main_response';
    } else {
        client.sendMessage(msg.from, 'Invalid option. Please try again.');
    }
}
    // Umrah Routes
else if (userState.menu === 'umrah_routes') {
    if (msg.body === '1') {
        client.sendMessage(msg.from, 'Here is the link for Karachi to Jeddah: https://malharmain.com/khi-jed-khi/');
        userState.menu = 'main';
    } else if (msg.body === '2') {
        client.sendMessage(msg.from, 'Here is the link for Multan to Jeddah: https://malharmain.com/mux-jed-mux/');
        userState.menu = 'main';
    } else if (msg.body === '3') {
        client.sendMessage(msg.from, 'Here is the link for Custom Package: https://malharmain.com/calculator/');
        userState.menu = 'main';
    } else if (msg.body === '0') {
        const mainMenu = `
You are now back to the Main Menu. Please select an option:
1️⃣ Umrah
2️⃣ Visa
3️⃣ Live Ticketing
4️⃣ Request a Call
        `;
        client.sendMessage(msg.from, mainMenu);
        userState.menu = 'awaiting_main_response';
    } else {
        client.sendMessage(msg.from, 'Invalid option. Please try again.');
    }
}

    // Visa Selection
    else if (userState.menu === 'visa_selection') {
        const visaDetails = {
            '1': `
    **Azerbaijan Visa:**
    Azerbaijan E-Visa - PKR 12,000.
Planning a trip to Azerbaijan? Simplify your travel with our Azerbaijan E-Visa service! With an easy, hassle-free online application process, you can get your visa in no time.
Visa Fee: PKR 12,000.
 Required Documents:
- Scanned Passport (1st Page) – Valid passport with at least 6 months validity from your travel date.
- Scanned CNIC – Front and back copies of your National ID Card (CNIC).
- Photocopy of CNIC – A clear photocopy of your valid ID card.
- Passport-size Photograph – 1 recent passport-size photo with a white background.
 Why Choose Us?
- Fast Processing: We ensure quick processing for your Azerbaijan E-Visa.
- Easy Application: Simple and straightforward steps to apply online.
- Expert Assistance: We assist you with all the necessary documentation for a smooth visa application.
Start your journey to Azerbaijan today! Contact us now for more details or to apply.
Contact Details:
- Phone: 0311 1150777
- Email: www.malharmain.com | www.uniqurairticket.com
Visit Us at:
- Office Location: Office # 01, Near Gillan CNG, Quid-e-Millat Road, Khanpur Janubi, Pakistan.
            `,
            '2': `
    **Indonesia Visa:**
    Indonesia E-Visa & Sticker Visa Application - PKR 50,000
Planning a trip to Indonesia? Whether it's for leisure, business, or tourism, obtaining your visa is simple with our comprehensive visa services. 
Types of Visas:
- E-Visa: Apply online and get your approval without the hassle of visiting an embassy. 
- Sticker Visa: A traditional visa stamped in your passport for easy travel.
Visa Requirements:
To ensure a smooth application process, please provide the following documents:
1. Valid Passport – Must be valid for at least 6 months from your intended date of travel. Don’t forget to attach your previous passport if applicable.
2. CNIC Copy – A photocopy of your valid Pakistani ID card.
3. Passport-sized Photos – Two recent photos with a white background.
4. Bank Statement – A 6-month statement showing a balance of at least $1,500 USD, ensuring sufficient funds for your visit.
5. Business Documents (for business visas) – Company letterhead, business registration certificate (NTN), and Chamber of Commerce or business association membership.
We ensure a hassle-free visa application experience for your convenience. Let us assist you in securing your visa, so you can focus on your upcoming journey to beautiful Indonesia.
Contact Details:
- Phone: 0311 1150777
For More Inquiries:
- Email: www.malharmain.com
www.uniqueairticket.com
Visit Us at:
- Office Location: Office # 01, Near Gillan CNG, Quid-e-Millat Road, Khanpur Janubi, Pakistan.
Feel free to reach out or stop by for assistance with your Indonesia visa application!
            `,
            '3': `
    **Sri Lanka Visa:**
    Unlock Your Sri Lanka Adventure with an E-Visa! 🇱🇰✨
Planning your trip to Sri Lanka? Apply for your 1-month E-Visa today for just PKR 15,000 and get ready to explore paradise! 🌴
Easy Steps to Apply:
1. ID Card Copy 📄
2. 1 Clear White Background Photo (with a dark shirt) 📸
3. Original Passport ✈️
4. All Doc's Scan🖨️
Super Fast Processing: Your E-Visa will be ready in just 3 to 4 days! ⏳
👉Our Office Location:
*Office # 01, Near Gillan CNG, Quid-e-Millat Road, Khanpur Janubi, Pakistan.
👉For More Details:
Contact:
0311 1150777
www.malharmain.com
www.uniqueairticket.com
Don't wait! Your Sri Lankan adventure is just a few steps away. Apply now for a quick and seamless visa experience!
            `,
            '4': `
    **Malaysia Visa:**
    E-visa Malaysia
PKR 15,000.00
Malaysia E-Visa ( with documents)
Rs 15000 

Malaysia E-Visa ( without documents)
Rs 25000

Malaysia Sticker Visa ( with documents)
Rs 25000 

Malaysia Sticker Visa 6 month ( with documents)
Rs 35000 

Documentation Required for Malaysia:

- Passport 1st page properly scanned (JPEG Format)

- High-resolution white background picture (JPEG Format)

- CNIC front & back properly scanned on a single page (PDF Format)

- Latest bank statement of 6 months with a 300,000/- balance (PDF Format)

- Return ticket & Hotel Booking (PDF Format)

Terms and Conditions:

- Processing time: 3 to 5 working days.

- Processing fee subject to change.

- Visa approval is at the sole discretion of the

Malaysian Immigration officials and not by

Marhaba Al-Harmain TRAVEL & TOURS

Contact No: 
03111150777
03001877555
https://www.malharmain.com/
https://www.malharmain.com/
Visa 01
            `,
            '5': `
    **Thailand Visa:**
    Unlock the Beauty of Thailand with Ease! ✨🌏
Planning your dream getaway to Thailand? We’ve got you covered! Apply for your ''Thailand Visa'' with a smooth and effortless process, and let us handle the details for you.
Visa Fee: PKR 25,000.00 Only 
Sticker Visa: Thailand Only
🌟 Documents Required:
- Original passport (new & old)
- If previous passport is missing, attach FIR report with English translation
- Photocopy of CNIC (National ID Card)
- 4 passport-sized photos (white background)
- Confirmed return ticket & hotel booking
- Bank statement (1 Year) with a minimum balance of 'PKR 300,000' (for individuals) / PKR 600,000 (for families)
- Business Registration Certificate (NTN) and Company Letterhead (for business applicants)
🌍 Ready to explore Thailand's stunning beaches, rich culture, and vibrant cities? 🌴✨  
Get your visa today and start planning the trip of a lifetime! For more details, visit: [www.malharmain.com](https://www.malharmain.com/)
www.uniqueairticket.com
📞-Contact us for assistance and application guidance!
0311 1150777
>Office Location: 
Office # 01 Near Gillan CNG Quid-e-Millat Road, Khanpur Janubi, Pakistan
            `,
            '6': `
    **Singapore Visa:**
    Marhaba Al-Harmain Travel and Tours Pvt. Ltd.
✨ Your Gateway to Singapore ✨
Are you planning to visit Singapore? Let us make your visa process hassle-free and smooth with our Singapore E-Visa services! We offer a range of options to suit your needs:
🌍 Singapore E-Visit Visa (with documents)  
💸 Only PKR 18,000
🌍 Singapore E-Visit Visa Done Base (with documents)  
💸 Only PKR 45,000
      Required Documents:
✔️ Scan copy of data page (valid for 9 months)  
✔️ Signature page of Passport  
✔️ Recent passport-sized photograph with white background  
✔️ CNIC copy of applicant  
✔️ Contact info (email and phone number)  
✔️ Monthly income in PKR  
✔️ Proof of income (e.g., NTN, FBR tax returns, last 6 months bank statement)  
✔️ Family Registration Certificate (FRC) for family applications  
✔️ Salary slips (if employed)
⏳ Process Time: 15-20 business days
Let us handle your visa applications with expertise and care. Contact us today for a seamless experience! 
📞 Contact Us:  
0311 1150777
> Our Office Location:
Office # 01 Near Gillan CNG Quid-e-Millat Road, Khanpur Janubi, Pakistan
🌐 Visit our website: [www.malharmain.com](https://www.malharmain.com)
www.uniqueairticket.com
Marhaba Al-Harmain Travel and Tours Pvt. Ltd. (IATA) 
Your trusted travel partner! 🌟
            `,
        };
        client.sendMessage(msg.from, visaDetails[msg.body] || 'Invalid option. Please try again.');
        userState.menu = 'main';
    }
    // Handle Live Ticketing
    else if (userState.menu === 'live_ticketing') {
        const details = msg.body.split('\n');
        const [name, number, sectorFrom, destination, dates] = details.map((line) => line.split(':')[1]?.trim());

        if (name && number && sectorFrom && destination && dates) {
            db.query(
                'INSERT INTO live_ticketing (name, number, sector_from, destination, dates) VALUES (?, ?, ?, ?, ?)',
                [name, number, sectorFrom, destination, dates],
                (err) => {
                    if (err) {
                        console.error('Error inserting data:', err.message);
                        client.sendMessage(msg.from, 'There was an error saving your details. Please try again.');
                    } else {
                        client.sendMessage(msg.from, 'Thank you for contacting! Your ticketing details have been saved. Our team will contact you shortly.');
                    }
                }
            );
        } else {
            client.sendMessage(msg.from, 'Invalid format. Please provide all details in the requested format.');
        }
        userState.menu = 'main';
    }
   // Handle Request a Call
   else if (userState.menu === 'request_call') {
    const details = msg.body.split('\n');
    const [name, number, note] = details.map((line) => line.split(':')[1]?.trim());

    if (name && number && note) {
        db.query(
            'INSERT INTO request_call (name, number, note) VALUES (?, ?, ?)',
            [name, number, note],
            (err) => {
                if (err) {
                    console.error('Error inserting data:', err.message);
                    client.sendMessage(msg.from, 'There was an error saving your details. Please try again.');
                } else {
                    client.sendMessage(msg.from, 'Thank you! Your request has been saved. Our team will call you soon.');
                }
            }
        );
    } else {
        client.sendMessage(msg.from, 'Invalid format. please provide all details in requested format.');
    }
    userState.menu = 'main';
}
});

// Start the client
client.initialize();

// Serve the frontend
app.use(express.static('public'));

// Start the server
server.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});
