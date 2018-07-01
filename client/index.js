import React from 'react'
import { render } from 'react-dom'
import { Provider } from 'react-redux'
import { compose, applyMiddleware, createStore } from 'redux'
import ready from 'domready'
import injectTapEventPlugin from 'react-tap-event-plugin'
import uuid from 'node-uuid'
import jwt from 'jsonwebtoken'

import App from './components/app'
import actions from './actions'
import reducer from './reducers'

let socket = null
let user = jwt.decode(window.token)

const logoutRedirectMiddleware = store => next => action => {
    if(actions.LOGOUT === action.type) {
        console.log('Logout triggered.')
        if(null !== socket) {
            socket.close()
        }

        const logoutUrl = `//${window.location.host}${window.location.pathname}logout`
        window.location.assign(logoutUrl)
    } else {
        next(action)
    }
}

const webSocketMiddleware = store => next => action => {
    if(actions.INPUT_SUBMITTED === action.type) {
        if(null !== socket) {
            socket.send(JSON.stringify({
                uri: actions.CHAT_MESSAGE,
                payload: {
                    id: uuid.v4(),
                    from: user.id,
                    body: action.data
                }
            }))
        }
    }

    next(action)
}

const finalCreateStore = compose(
    applyMiddleware(
        logoutRedirectMiddleware,
        webSocketMiddleware
    )
)(createStore)

const store = finalCreateStore(reducer)

ready(() => {
    injectTapEventPlugin()

    socket = new WebSocket(`ws://${window.location.hostname}:8080/`, ['token', window.token])
    socket.onmessage = (m) => {
        try {
            let message = JSON.parse(m.data)
            const action = {
                type: message.uri, // actions.CHAT_MESSAGE,
                data: message.payload
            }
            store.dispatch(action)
        } catch(e) {
            console.error(e)
            throw(e)
        }
    }

    render(
        <Provider store={store}>
            <App />
        </Provider>,
        document.getElementById('origin'))
})
