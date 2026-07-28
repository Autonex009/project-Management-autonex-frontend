import React from "react";
import { Outlet, useLocation } from "react-router-dom";

const AuthLayout = () => {
  const location = useLocation();
  const isAdmin = location.pathname.includes("admin");

  const theme = {
    admin: {
      bg: "bg-brand-adminDark",
      accent: "text-brand-admin",
      button: "bg-brand-admin hover:bg-brand-admin/90",
      illustration: "bg-gradient-to-br from-slate-900 to-indigo-900",
      quote:
        '"Leadership is about making others better as a result of your presence and making sure that impact lasts in your absence."',
      author: "Admin Portal",
    },
    employee: {
      bg: "bg-brand-employeeBg",
      accent: "text-brand-employee",
      button: "bg-brand-employee hover:bg-brand-employee/90",
      illustration: "bg-gradient-to-br from-emerald-800 to-teal-900",
      quote:
        '"Excellence is not a skill, it is an attitude. Focus on your goals and achieve greatness."',
      author: "Employee Portal",
    },
  };

  const currentTheme = isAdmin ? theme.admin : theme.employee;

  return (
    <div className="flex min-h-screen w-full">
      {/* Left Side - Visual & Branding */}
      <div
        className={`hidden lg:flex lg:w-1/2 relative overflow-hidden ${currentTheme.illustration} text-white justify-center items-center p-12`}
      >
        {/* Abstract Shapes/Texture */}
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-white blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-white blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-lg">
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              Autonex Resource Planning
            </h1>
            <p className="text-lg text-white/80">
              Streamline your workforce, optimize allocations, and drive project
              success.
            </p>
          </div>

          <blockquote className="border-l-4 border-white/30 pl-6 italic text-xl text-white/90">
            {currentTheme.quote}
          </blockquote>
          <p className="mt-4 font-semibold text-white/70 pl-6">
            — {currentTheme.author}
          </p>
        </div>
      </div>

      {/* Right Side - Form Container */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-12 bg-white relative">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Header (Visible only on small screens) */}
          <div className="lg:hidden text-center mb-8">
            <h2 className={`text-2xl font-bold ${currentTheme.accent}`}>
              Autonex
            </h2>
          </div>

          <Outlet context={{ theme: currentTheme }} />

          <div className="text-center text-sm text-slate-400 mt-8">
            &copy; {new Date().getFullYear()} Autonex Inc. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
