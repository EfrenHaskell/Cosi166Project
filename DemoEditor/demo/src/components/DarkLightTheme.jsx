import { useState, useEffect, use } from 'react';

export default function DarkLightTheme() {

    //need to start chaging colors of buttons other objects etc


    const [backgroundColor, setBackgroundColor] = useState('white')
    const [textColor, setTextColor] = useState('black')

    const backgroundTheme = () => {
        setBackgroundColor(prevColor => (prevColor === 'white' ? 'black' : 'white'));
        setTextColor(prevColor => (prevColor === 'black' ? 'white' : 'black'));
    };

    useEffect(() => {
        document.body.style.backgroundColor = backgroundColor;
    }, [backgroundColor]);

    useEffect(() => {
        document.body.style.color = textColor;
    }, [textColor]);


    return (
        <>

            <button id='theme-toggle' onClick={backgroundTheme}> Toggle theme </button>

        </>

    );

};