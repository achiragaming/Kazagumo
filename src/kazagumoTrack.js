const error = require('./kazagumoError');
const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Discord User
 * @external DiscordUser
 * @see {@link https://discord.js.org/#/docs/main/stable/class/User}
 */

/**
 * Kazagumo Track
 * @class kazagumoTrack
 */
class kazagumoTrack {
    /**
     * Kazagumo Track's information
     * @param {Object} kazagumoRawTrack
     * @param {string} kazagumoRawTrack.track The Base64 string of this song
     * @param {Object} kazagumoRawTrack.info Information of this song
     * @property {string} kazagumoRawTrack.info.sourceName The source name
     * @property {string} [kazagumoRawTrack.info.identifier] The song's identifier
     * @property {boolean} [kazagumoRawTrack.info.isSeekable=false] Whether the song is seekable or not
     * @property {string} [kazagumoRawTrack.info.author] The song's author
     * @property {number} [kazagumoRawTrack.info.length=0] The song's length
     * @property {boolean} [kazagumoRawTrack.info.isStream=false] Whether the song is stream or not
     * @property {number} [kazagumoRawTrack.info.position=0] The song's start position
     * @property {string} [kazagumoRawTrack.info.thumbnail] The song's thumbnail
     * @property {string} kazagumoRawTrack.info.title The song's title
     * @property {string} kazagumoRawTrack.info.uri The song's uri that will be shown
     * @property {string} [kazagumoRawTrack.info.realUri] The real uri of this song, good to hide spotify track
     * @param {Kazagumo} kazagumo Kazagumo's instance
     * @param {DiscordUser} [requester=null] The requester of this song
     */
    constructor(kazagumoRawTrack, kazagumo, requester) {
        this.track = kazagumoRawTrack.track;
        this.sourceName = kazagumoRawTrack.info.sourceName;
        this.identifier = kazagumoRawTrack.info.identifier;
        this.isSeekable = !!kazagumoRawTrack.info.isSeekable;
        this.author = kazagumoRawTrack.info.author;
        this.length = kazagumoRawTrack.info.length;
        this.isStream = !!kazagumoRawTrack.info.isStream;
        this.position = kazagumoRawTrack.info.position
        this.thumbnail = kazagumoRawTrack.info.thumbnail;
        this.title = kazagumoRawTrack.info.title;
        this.uri = kazagumoRawTrack.info.uri;
        this.realUri = this.checkSupportedSource() ? kazagumoRawTrack.info.uri : null;
        this.requester = requester ? requester : null;

        this.getThumbnail();
        /**
         * @private
         */
        this.kazagumo = kazagumo;
    }

    /**
     * Resolve all required metadata of the song
     * @param {?boolean} [overwrite=false]
     * @returns {Promise<kazagumoTrack>}
     */
    async resolve(overwrite) {
        if (!this.checkValidation()) this.kazagumo.emit("debug", `Resolving track. | Title: ${this.title}; URI: ${this.uri}`)
        if (this.checkValidation()) return this;
        const result = await this.getTrack();
        this.track = result.track;
        this.realUri = result.info.uri;
        if (overwrite) {
            this.title = result.info.title;
            this.identifier = result.info.identifier;
            this.isSeekable = result.info.isSeekable;
            this.author = result.info.author;
            this.length = result.info.length;
            this.isStream = result.info.isStream;
            this.uri = result.info.uri;
        }
        return this;
    }

    /**
     * Get track metadata from node
     * @private
     * @returns {Promise<ShoukakuTrack>}
     */
    async getTrack() {
        const sources = {
            "youtube": "yt",
            "youtube_music": "ytm",
            "soundcloud": "sc"
        };
        const source = sources[this.kazagumo._kazagumoOptions.defaultSearchEngine || "youtube"];
        const query = [this.author, this.title].filter(x => !!x).join(" - ");
        const node = this.kazagumo.shoukaku.getNode();

        const result = await node.rest.resolve(`${source}search:${query}`);
        if (!result || !result.tracks.length) throw new error("No track was found");

        if (this.author) {
            const author = [this.author, `${this.author} - Topic`];
            const officialTrack = result.tracks.find(track => author.some(name => new RegExp(`^${escapeRegExp(name)}$`, "i").test(track.info.author)) ||
                new RegExp(`^${escapeRegExp(this.title)}$`, "i").test(track.info.title))
            if (officialTrack) return officialTrack;
        }
        if (this.length) {
            const sameDuration = result.tracks.find(track => (track.info.length >= (this.length - 2000)) && (track.info.length <= (this.length + 2000)));
            if (sameDuration) return sameDuration;
        }

        return result.tracks[0];
    }

    /**
     * Set requester for this track
     * @param {DiscordUser} discordUser
     * @returns {kazagumoTrack}
     */
    setRequester(discordUser) {
        this.requester = discordUser;
        return this;
    }

    /**
     * Get thumbnail for the track
     * @private
     */
    getThumbnail() {
        if (this.thumbnail) return;
        if (this.sourceName === "youtube") this.thumbnail = `https://img.youtube.com/vi/${this.identifier}/maxresdefault.jpg`;
        else this.thumbnail = null;
    }

    /**
     * Check if the track's source is internally supported by lavalink to prevent multiple track resolving
     * @returns {boolean}
     * @private
     */
    checkSupportedSource() {
        let sources = [
            'bandcamp',
            'beam',
            'getyarn',
            'http',
            'local',
            'nico',
            'soundcloud',
            'stream',
            'twitch',
            'vimeo',
            'youtube'
        ]
        return sources.includes(this.sourceName);
    }

    /**
     * Validate if we need to resolve again or not
     * @private
     * @returns {*}
     */
    checkValidation() {
        return this.track &&
            this.sourceName &&
            this.identifier &&
            this.author &&
            this.length &&
            this.title &&
            this.uri &&
            this.realUri
    }
}

module.exports = kazagumoTrack;