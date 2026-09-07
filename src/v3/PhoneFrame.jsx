import React from 'react'
import { Wifi, Signal, BatteryFull } from 'lucide-react'
import './phone-frame.css'

export default function PhoneFrame({ children, className = '', ...props }) {
  return <div className={'st-phone ' + className} {...props}>
    <div className="st-phone-keys" aria-hidden="true"><i/><i/><i/></div>
    <div className="st-phone-glass">
      <div className="st-phone-status" aria-hidden="true"><span>9:41</span><i className="st-phone-camera"/><span><Signal size={11}/><Wifi size={11}/><BatteryFull size={15}/></span></div>
      <div className="st-phone-content">{children}</div>
      <div className="st-phone-bottom" aria-hidden="true"><i/></div>
    </div>
  </div>
}
