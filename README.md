                    git clone https://github.com/USERNAME/REPO_NAME.git

                    cd my-vite-app


                    npm install



                    npm run build


                    sudo rm -rf /var/www/html/*
                    sudo cp -r dist/* /var/www/html/
                    sudo systemctl restart apache2

                    /var/www/html ichida .htaccess yaratish:
                    sudo touch /var/www/html/.htaccess


                    sudo apt install nano -y
                    sudo nano /var/www/html/.htaccess


                    <IfModule mod_rewrite.c>
                    RewriteEngine On
                    RewriteBase /
                    
                    # Fayl yoki papka topilmasa index.html ga yo'naltirish
                    RewriteCond %{REQUEST_FILENAME} !-f
                    RewriteCond %{REQUEST_FILENAME} !-d
                    RewriteRule . /index.html [L]
                    </IfModule>
                    
                    
                    Ctrl+O → Enter → Ctrl+X bilan saqlash va chiqish.




                    .htaccess ishlashi uchun AllowOverride yoqilgan bo‘lishi kerak:
        
                    sudo nano /etc/apache2/sites-available/000-default.conf
                    
                    
                    <VirtualHost *:80> ichida qo‘shing yoki tekshiring:
                    
                    <Directory /var/www/html>
                        AllowOverride All
                    </Directory>
                    
                    
                    Saqlash → chiqish...    



                    sudo a2enmod rewrite
                    sudo systemctl restart apache2



                    git pull
                    npm install
                    npm run build
                    cp -r dist/* /var/www/myapp/

`

                    npm install react-to-print

UPDATE SITE axaxaxaxa

                    //update site
                    git pull
                    npm run build
                    sudo rm -rf /var/www/html/*
                    sudo cp -r dist/* /var/www/html/
                    sudo cp site/index.html /var/www/newyork24/
                    sudo systemctl restart apache2

                    (dist → newyork24.uz/shorva — xodimlar tizimi; site/index.html → newyork24.uz — bosh sahifa)

                    Android ilova (bosh sahifadagi "APK yuklab olish" tugmasi → newyork24.uz/newyork24.apk) —
                    yangi versiya chiqqanda, kompyuterdan (Kotlin_NYFF da yig'ilgan APK):
                    scp app-release.apk USER@SERVER:/tmp/newyork24.apk
                    serverda:
                    sudo cp /tmp/newyork24.apk /var/www/newyork24/newyork24.apk

                    localhost
                    localhost




                    cd ~/ReactJS_NYFF
                    git pull
                    npm install
                    npm run build
                    sudo rm -rf /var/www/html/*
                    sudo cp -r dist/* /var/www/html/
                    sudo cp site/index.html /var/www/newyork24/
                    sudo systemctl restart apache2



                    cd ~/NestJS_NYFF
                    git pull
                    nano .env          # bir marta: oxiriga  UI_DIST=/var/www/html  qo'shing (Android ikonkalari uchun)
                    npm install
                    npm run build
                    pm2 restart nest-app


  SERVER SETTINGS

                1. DNS (newyork24.uz provayderida)
                @ → A → yangi server IP
                www → CNAME → newyork24.uz

                Tekshirish (5-30 daqiqa ketishi mumkin):

                bash
                dig +short newyork24.uz

                Yangi server IP si chiqmaguncha 6-qadamga o’tmang.

                2. Hetzner Firewall

                Console → Firewalls da 22, 80, 443 ruxsat berilgan bo’lsin. 3000 ochilmasin.

                3. Serverga kirib, kerakli dasturlarni o’rnating
                bash
                ssh root@YANGI_SERVER_IP
                apt update && apt upgrade -y
                apt install -y apache2 certbot python3-certbot-apache git curl ufw

                # Node.js 22 va pm2
                curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
                apt install -y nodejs
                npm install -g pm2

                # Firewall
                ufw allow OpenSSH
                ufw allow 80,443/tcp
                ufw enable

                # Apache modullari
                a2enmod ssl proxy proxy_http proxy_wstunnel rewrite headers
                a2dissite 000-default.conf
                echo "ServerName localhost" > /etc/apache2/conf-available/servername.conf
                a2enconf servername
                4. Loyihalarni yuklang
                bash
                cd ~
                git clone <BACKEND_REPO_URL> newyork24-backend
                git clone <FRONTEND_REPO_URL> newyork24-frontend

                Repo private bo’lsa, GitHub token yoki SSH kalit kerak bo’ladi.

                5. Backendni ishga tushiring
                bash
                cd ~/newyork24-backend
                nano .env          # PORT=3000 va boshqa kerakli sozlamalar (DB va h.k.)
                npm install
                npm run build
                pm2 start dist/main.js --name newyork24
                pm2 save
                pm2 startup        # chiqargan buyruqni nusxalab ishga tushiring

                Tekshirish:

                bash
                ss -tlnp | grep 3000
                curl -i http://127.0.0.1:3000/api/health

                (Agar dist/main.js topilmasa, ls dist qiling. Birinchi loyihani qanday ishga tushirgan bo’lsangiz, shunday.) Ma’lumotlar bazasi ishlatsangiz (MongoDB, PostgreSQL va h.k.), uni ham shu serverga o’rnatish kerak bo’ladi, ayting.

                6. Frontendning birinchi build’i

                Frontendda API manzili nisbiy /api yoki https://newyork24.uz/api bo’lsin, Socket.IO uchun https://newyork24.uz. Keyin:

                bash
                cd ~/newyork24-frontend
                npm install
                npm run build
                rm -rf /var/www/html/*
                cp -r dist/* /var/www/html/
                chown -R www-data:www-data /var/www/html
                7. Avval HTTP sozlama (sertifikat olish uchun)
                bash
                nano /etc/apache2/sites-available/newyork24.uz.conf
                apache
                <VirtualHost *:80>
                    ServerName newyork24.uz
                    ServerAlias www.newyork24.uz
                    DocumentRoot /var/www/html
                </VirtualHost>
                bash
                a2ensite newyork24.uz.conf
                apache2ctl configtest && systemctl restart apache2
                certbot certonly --apache -d newyork24.uz -d www.newyork24.uz

                Email va shartlarga rozilik so’raydi. Oxirida sertifikat /etc/letsencrypt/live/newyork24.uz/ ga tushadi.

                8. Yakuniy sozlama (HTTP→HTTPS + proxy)

                Shu faylni to’liq almashtiring:

                bash
                > /etc/apache2/sites-available/newyork24.uz.conf
                nano /etc/apache2/sites-available/newyork24.uz.conf
                apache
                <VirtualHost *:80>
                    ServerName newyork24.uz
                    ServerAlias www.newyork24.uz
                    RewriteEngine On
                    RewriteRule ^ https://newyork24.uz%{REQUEST_URI} [R=301,L]
                </VirtualHost>

                <VirtualHost *:443>
                    ServerName newyork24.uz
                    ServerAlias www.newyork24.uz
                    DocumentRoot /var/www/html

                    <Directory /var/www/html>
                        Options -Indexes
                        Require all granted
                        FallbackResource /index.html
                    </Directory>

                    ProxyPreserveHost On
                    RequestHeader set X-Forwarded-Proto "https"

                    RewriteEngine On
                    RewriteCond %{HTTP:Upgrade} =websocket [NC]
                    RewriteRule ^/socket.io/(.*) ws://127.0.0.1:3000/socket.io/$1 [P,L]

                    ProxyPass /api http://127.0.0.1:3000/api
                    ProxyPassReverse /api http://127.0.0.1:3000/api
                    ProxyPass /socket.io http://127.0.0.1:3000/socket.io
                    ProxyPassReverse /socket.io http://127.0.0.1:3000/socket.io
                    ProxyPass /images http://127.0.0.1:3000/images
                    ProxyPassReverse /images http://127.0.0.1:3000/images

                    SSLEngine on
                    SSLCertificateFile /etc/letsencrypt/live/newyork24.uz/fullchain.pem
                    SSLCertificateKeyFile /etc/letsencrypt/live/newyork24.uz/privkey.pem
                </VirtualHost>

                Yopishtirgandan keyin ServerAlias www.newyork24.uz oddiy matn ekanini tekshiring (havolaga aylanib qolmasin). Keyin:

                bash
                apache2ctl configtest && systemctl restart apache2

                Backendda /images o’rniga boshqa yo’l bo’lsa (masalan /uploads), shu qatorlarni o’zgartiring.

                9. Tekshiring
                bash
                curl -i https://newyork24.uz/api/health
                curl -I http://newyork24.uz
                certbot renew --dry-run
                Birinchisida NestJS javobi (JSON) kelishi kerak.
                Ikkinchisida 301 va Location: https://newyork24.uz/... chiqishi kerak.
                Brauzerda https://newyork24.uz oching, ichki sahifada F5 bossangiz ham 404 chiqmasligi kerak.
                Har safar saytni yangilash

                Sizning usulingiz shu yerda ham ishlaydi, frontend papkasida:

                bash
                cd ~/newyork24-frontend
                git pull
                npm run build
                sudo rm -rf /var/www/html/*
                sudo cp -r dist/* /var/www/html/
                sudo systemctl restart apache2

                restart shart emas (fayllar almashishi bilan yangilanadi), lekin zarar ham qilmaydi.

                Backend yangilansa, alohida:

                bash
                cd ~/newyork24-backend
                git pull
                npm install
                npm run build
                pm2 restart newyork24

Android
                scp "C:\BACKEND APPS\Kotlin_NYFF\app\release\NYFF v2.apk" root@2.31.205.252:/root/Android/newyork24.apk
