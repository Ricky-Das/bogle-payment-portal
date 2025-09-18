import React from "react";
import logo from "../assets/bogle-logo.png";

function Logo({ className = "w-16 h-auto" }) {
  return <img src={logo} alt="Bogle" className={className} />;
}

export default Logo;
