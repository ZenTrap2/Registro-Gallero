import {createContext,useContext} from 'react';import{getSettings}from'./settings';
export const SettingsContext=createContext(getSettings({birds:[],events:[]}));
export const useSettings=()=>useContext(SettingsContext);
