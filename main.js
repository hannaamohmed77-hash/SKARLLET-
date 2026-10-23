const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason
} = require('@whiskeysockets/baileys');

const fs = require('fs-extra');
const pino = require('pino');
const path = require('path');
const chalk = require('chalk');
const { exec } = require('child_process');

const logger = require('./utils/console');


// ======================================================
// 🖤 السؤال بدون readline
// ======================================================

const question = text => new Promise(resolve => {

    process.stdout.write(text);

    process.stdin.setEncoding('utf8');

    const onData = data => {

        process.stdin.pause();

        process.stdin.removeListener(
            'data',
            onData
        );

        resolve(
            String(data).trim()
        );

    };

    process.stdin.resume();

    process.stdin.once(
        'data',
        onData
    );

});


// ======================================================
// 🖤 DARK
// ======================================================

const asciiArt = `
${chalk.hex('#A855F7')('██████╗  █████╗ ██████╗ ██╗  ██╗     ██╗     ██╗████████╗███████╗')}
${chalk.hex('#A855F7')('██╔══██╗██╔══██╗██╔══██╗██║ ██╔╝     ██║     ██║╚══██╔══╝██╔════╝')}
${chalk.hex('#A855F7')('██║  ██║███████║██████╔╝█████╔╝      ██║     ██║   ██║   █████╗  ')}
${chalk.hex('#A855F7')('██║  ██║██╔══██║██╔══██╗██╔═██╗      ██║     ██║   ██║   ██╔══╝  ')}
${chalk.hex('#A855F7')('██████╔╝██║  ██║██║  ██║██║  ██╗     ███████╗██║   ██║   ███████╗')}
${chalk.hex('#A855F7')('╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝     ╚══════╝╚═╝   ╚═╝   ╚══════╝')}
`;


// ======================================================
// 🔊 الصوت
// ======================================================

function playSound(name) {

    try {

        const controlPath =
            path.join(
                __dirname,
                'sounds',
                'sound.txt'
            );

        const status =
            fs.existsSync(controlPath)
                ? fs.readFileSync(
                    controlPath,
                    'utf8'
                ).trim()
                : 'off';

        if (status !== '{on}') {
            return;
        }

        const filePath =
            path.join(
                __dirname,
                'sounds',
                name
            );

        if (
            fs.existsSync(filePath)
        ) {

            exec(
                `mpv --no-terminal --really-quiet "${filePath}"`
            );

        }

    } catch (error) {

        // الصوت اختياري

    }

}


// ======================================================
// 📡 تحميل ملفات الأحداث
// ======================================================

async function loadEventHandlers(sock) {

    const eventsDir =
        path.join(
            __dirname,
            'handlers',
            'events'
        );

    try {

        await fs.ensureDir(
            eventsDir
        );

        const files =
            await fs.readdir(
                eventsDir
            );

        const jsFiles =
            files.filter(file =>
                file.endsWith('.js') &&
                file !== 'index.js'
            );

        console.log(
            `\n📡 تحميل ملفات الأحداث: ${jsFiles.length}`
        );

        const pendingJoinRequests =
            new Map();

        for (
            const file of jsFiles
        ) {

            const filePath =
                path.join(
                    eventsDir,
                    file
                );

            try {

                delete require.cache[
                    require.resolve(filePath)
                ];

                const eventHandler =
                    require(filePath);


                // ==================================================
                // register()
                // ==================================================

                if (
                    eventHandler &&
                    typeof eventHandler.register === 'function'
                ) {

                    await eventHandler.register(
                        sock,
                        {
                            pendingJoinRequests
                        }
                    );

                    console.log(
                        `   ✓ تم تحميل الحدث: ${file}`
                    );

                    continue;

                }


                // ==================================================
                // function
                // ==================================================

                if (
                    typeof eventHandler === 'function'
                ) {

                    await eventHandler(
                        sock
                    );

                    console.log(
                        `   ✓ تم تحميل الحدث: ${file}`
                    );

                    continue;

                }


                // ==================================================
                // init()
                // ==================================================

                if (
                    eventHandler &&
                    typeof eventHandler.init === 'function'
                ) {

                    await eventHandler.init(
                        sock,
                        {
                            pendingJoinRequests
                        }
                    );

                    console.log(
                        `   ✓ تم تحميل الحدث: ${file}`
                    );

                    continue;

                }


                console.warn(
                    `   ⚠️ ${file} لا يحتوي على register أو init أو function`
                );

            } catch (error) {

                console.error(
                    `   ✗ فشل تحميل ${file}:`
                );

                console.error(
                    `      الملف: ${file}`
                );

                console.error(
                    `      الخطأ: ${error?.name || 'Error'}`
                );

                console.error(
                    `      الرسالة: ${error?.message || error}`
                );

            }

        }

        console.log(
            '📡 انتهى تحميل ملفات الأحداث\n'
        );

    } catch (error) {

        console.error(
            '❌ فشل تحميل مجلد الأحداث:'
        );

        console.error(
            `   الخطأ: ${error?.name || 'Error'}`
        );

        console.error(
            `   الرسالة: ${error?.message || error}`
        );

    }

}


// ======================================================
// 🚀 تشغيل البوت
// ======================================================

async function startBot() {

    try {

        console.clear();

        console.log(asciiArt);

        console.log(
            chalk
                .hex('#A855F7')
                .bold('\nHello sir\n')
        );


        // ==================================================
        // 🔊 الصوت
        // ==================================================

        playSound(
            'ANASTASIA.mp3'
        );


        // ==================================================
        // 📁 مجلد الجلسة
        // ==================================================

        const sessionDir =
            path.join(
                __dirname,
                'ملف_الاتصال'
            );

        await fs.ensureDir(
            sessionDir
        );


        // ==================================================
        // 🔐 حالة الاتصال
        // ==================================================

        const {
            state,
            saveCreds
        } =
            await useMultiFileAuthState(
                sessionDir
            );


        // ==================================================
        // 📱 إنشاء الاتصال
        // ==================================================

        const sock =
            makeWASocket({

                auth: state,

                printQRInTerminal: false,

                browser: [
                    'MacOs',
                    'Chrome',
                    '1.0.0'
                ],

                logger:
                    pino({
                        level: 'silent'
                    }),

                markOnlineOnConnect:
                    true,

                generateHighQualityLinkPreview:
                    true

            });


        // ==================================================
        // 💾 حفظ بيانات الجلسة
        // ==================================================

        sock.ev.on(
            'creds.update',
            saveCreds
        );

        try {
            require('./lib/modProtection').register(sock);
        } catch (error) {}


        // ==================================================
        // 👥 تحديثات المجموعات
        // ==================================================

        sock.ev.on(
            'groups.upsert',
            async groups => {

                if (
                    !Array.isArray(groups)
                ) {
                    return;
                }

                for (
                    const group of groups
                ) {

                    try {

                        if (
                            !group?.id
                        ) {
                            continue;
                        }

                        await sock.groupMetadata(
                            group.id
                        );

                        console.log(
                            `[+] تم تحميل بيانات مجموعة: ${
                                group.subject || group.id
                            }`
                        );

                    } catch (err) {

                        console.warn(
                            `[-] فشل في تحميل بيانات مجموعة: ${
                                group?.id
                            }`
                        );

                    }

                }

            }
        );


        // ==================================================
        // 📲 طلب رقم الهاتف لأول تشغيل
        // ==================================================

        if (
            !sock.authState.creds.registered
        ) {

            console.log(
                chalk.bold(
                    '\n[ SETUP ] Please enter your phone number to receive the pairing code:'
                )
            );

            console.log(
                chalk.dim(
                    '          (Type "#" to cancel)\n'
                )
            );


            let phoneNumber =
                await question(
                    chalk
                        .hex('#A855F7')
                        .bold(
                            ' Phone Number : '
                        )
                );


            if (
                phoneNumber.trim() === '#'
            ) {

                process.exit();

            }


            phoneNumber =
                phoneNumber.replace(
                    /[^0-9]/g,
                    ''
                );


            if (
                !phoneNumber.match(
                    /^\d{10,15}$/
                )
            ) {

                console.log(
                    '\n[ ERROR ] Invalid phone number.\n'
                );

                process.exit(1);

            }


            try {

                const code =
                    await sock.requestPairingCode(
                        phoneNumber
                    );

                console.log(
                    `\nPairing Code: ${code}`
                );

                console.log(
                    `Phone Number: ${phoneNumber}\n`
                );

            } catch (error) {

                console.log(
                    '\n[ ERROR ] Failed to get pairing code.\n'
                );

                process.exit(1);

            }

        }


        // ==================================================
        // 🔌 حالة الاتصال
        // ==================================================

        sock.ev.on(
            'connection.update',
            async update => {

                try {

                    const {
                        connection,
                        lastDisconnect
                    } = update;


                    // ==================================================
                    // Connecting
                    // ==================================================

                    if (
                        connection === 'connecting'
                    ) {

                        logger.info(
                            'Connecting to WhatsApp...'
                        );

                    }


                    // ==================================================
                    // Open
                    // ==================================================

                    if (
                        connection === 'open'
                    ) {

                        logger.success(
                            `CONNECTED! USER ID: ${
                                sock.user?.id || 'Unknown'
                            }`
                        );


                        // ==================================================
                        // 👑 تسجيل رقم البوت كمالك حقيقي
                        // ==================================================

                        try {

                            const {
                                setBotSessionInfo
                            } =
                                require(
                                    './handlers/handler'
                                );


                            // استخراج رقم الحساب الذي شغل البوت
                            const botNumber =
                                String(
                                    sock.user?.id || ''
                                )
                                    .split(':')[0]
                                    .replace(
                                        /[^0-9]/g,
                                        ''
                                    );


                            if (
                                !botNumber
                            ) {

                                logger.error(
                                    '❌ تعذر استخراج رقم البوت.'
                                );

                            } else {

                                let lidNumber = '';


                                // ==================================================
                                // محاولة الحصول على LID
                                // ==================================================

                                try {

                                    const jid =
                                        `${botNumber}@s.whatsapp.net`;

                                    const [info] =
                                        await sock.onWhatsApp(
                                            jid
                                        );

                                    if (
                                        info?.lid
                                    ) {

                                        lidNumber =
                                            String(
                                                info.lid
                                            )
                                                .replace(
                                                    /[^0-9]/g,
                                                    ''
                                                );

                                    }

                                } catch (error) {

                                    logger.warn(
                                        `⚠️ تعذر الحصول على LID: ${
                                            error.message
                                        }`
                                    );

                                }


                                // ==================================================
                                // تسجيل المالك داخل Handler
                                // ==================================================

                                setBotSessionInfo(
                                    botNumber,
                                    lidNumber
                                );


                                logger.success(
                                    `👑 مالك البوت: ${botNumber}` +
                                    (
                                        lidNumber
                                            ? ` | LID: ${lidNumber}`
                                            : ''
                                    )
                                );

                            }

                        } catch (error) {

                            logger.error(
                                '❌ فشل تسجيل مالك البوت:',
                                error.message
                            );

                        }


                        // ==================================================
                        // ⚙️ تحميل Handler
                        // ==================================================

                        try {

                            const handler =
                                require(
                                    './handlers/handler'
                                );

                            if (
                                typeof handler.handleMessagesLoader ===
                                'function'
                            ) {

                                await handler.handleMessagesLoader();

                            }

                        } catch (error) {

                            logger.error(
                                '❌ فشل تحميل Handler:',
                                error
                            );

                        }


                        // ==================================================
                        // 📡 تحميل الأحداث
                        // ==================================================

                        await loadEventHandlers(
                            sock
                        );

                    }


                    // ==================================================
                    // Close
                    // ==================================================

if (
                        connection === 'close'
                    ) {

                        const statusCode =
                            lastDisconnect
                                ?.error
                                ?.output
                                ?.statusCode;


                        const isLoggedOut =
                            statusCode ===
                            DisconnectReason.loggedOut;


                        logger.warn(
                            `Disconnected: ${
                                lastDisconnect
                                    ?.error
                                    ?.message ||
                                statusCode ||
                                'Unknown'
                            }`
                        );


                        if (
                            isLoggedOut
                        ) {

                            playSound(
                                'LOGGOUT.mp3'
                            );

                            logger.error(
                                'You have been logged out.'
                            );

                            process.exit(1);

                        }


                        logger.info(
                            'Reconnecting in 3 seconds...'
                        );


                        setTimeout(
                            startBot,
                            3000
                        );

                    }

                } catch (error) {

                    logger.error(
                        '❌ خطأ في connection.update:',
                        error
                    );

                }

            }
        );


        // ==================================================
        // 💬 استقبال الرسائل
        // ==================================================

        sock.ev.on(
            'messages.upsert',
            async m => {

                try {

                    const {
                        handleMessages
                    } =
                        require(
                            './handlers/handler'
                        );


                    if (
                        typeof handleMessages !==
                        'function'
                    ) {

                        logger.error(
                            '❌ handleMessages غير موجود'
                        );

                        return;

                    }


                    await handleMessages(
                        sock,
                        m
                    );

                } catch (err) {

                    logger.error(
                        'Error while handling message:',
                        err
                    );

                    playSound(
                        'ERROR.mp3'
                    );

                }

            }
        );

    } catch (err) {

        logger.error(
            'Startup error:',
            err
        );

        playSound(
            'ERROR.mp3'
        );


        // ==================================================
        // 🔄 إعادة التشغيل
        // ==================================================

        setTimeout(
            startBot,
            3000
        );

    }

}


// ======================================================
// 🚀 البداية
// ======================================================

startBot();