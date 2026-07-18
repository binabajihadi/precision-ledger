@echo off
:: رفتن به پوشه‌ای که این فایل داخل آن قرار دارد
cd /d "%~dp0"

:: بررسی و دانلود پیش‌نیازها در صورت نیاز
echo Checking and installing dependencies...
call npm install

:: باز کردن آدرس سایت در مرورگر پیش‌فرض سیستم
start http://localhost:3000

:: اجرای سرور پروژه در یک پنجره کوچک‌شده (Minimize) برای جلوگیری از شلوغی
start /min cmd /c "npm run dev"

:: بستن این پنجره CMD
exit