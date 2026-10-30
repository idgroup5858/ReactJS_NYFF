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



                    npm install react-to-print


                    //update site
                    git pull
                    npm run build
                    sudo rm -rf /var/www/html/*
                    sudo cp -r dist/* /var/www/html/
                    sudo systemctl restart apache2

                    localhost
                    localhost