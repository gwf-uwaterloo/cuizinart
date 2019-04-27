import React, {Component} from "react";
import {Modal} from "react-bootstrap";
import Button from "@material-ui/core/Button";
import CardContent from "@material-ui/core/CardContent";
import Card from "@material-ui/core/Card";
import LoaderButton from "./LoaderButton";

export default class Disclaimer extends Component {

    render() {
        return (
            <Modal className={"Disclaimer"} show={this.props.showDisclaimerModal} onHide={this.props.onClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Disclaimer & Privacy</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Card>
                        <CardContent>
                            <h3>Disclaimer</h3>
                            <p>By using this web site you are agreeing to Appendix D of the <a target="_blank" rel="noopener noreferrer"
                                href="https://gwf.usask.ca/documents/GWF_Data_Policy_March-4-2019-Final.pdf">GWF Data
                                Policy</a>.</p>
                            <p>
                                The data provided on this web site has been obtained from a variety of sources and is
                                provided as a public service by the University of Waterloo. It is provided by the
                                University of Waterloo with an open license on an "AS IS" basis without any warranty or
                                representation, express or implied, as to its accuracy or completeness.
                            </p>
                            <h5>Disclaimer of Liability</h5>
                            <p>While we make every effort to ensure that its databases are error-free, errors do occur.
                                We ask that you notify us immediately of any errors that you discover in our data.
                                We will make every effort to correct them.</p>
                            <p>With respect to documents available from this server, we do not make any warranty,
                                express or implied, including the warranties of merchantability and fitness for a
                                particular purpose; nor assumes any legal liability or responsibility for the accuracy,
                                completeness, or usefulness of any information, apparatus, product, or process
                                disclosed; nor represents that its use would not infringe privately owned rights.</p>
                            <h5>Disclaimer of Endorsement</h5>
                            <p>Reference to any specific commercial products, process, or service by trade name,
                                trademark, manufacturer, or otherwise, does not constitute or imply its endorsement,
                                recommendation, or favoring by us. The views and opinions of authors expressed on the
                                Cuizinart web site do not necessarily state or reflect those of the maintainers of this
                                site, and shall not be used for advertising or product endorsement purposes.</p>
                            <h5>Disclaimer for External Links</h5>
                            <p>The appearance of external links on the Cuizinart web site does not constitute
                                endorsement of external web sites or the information, products, or services contained
                                therein by the mainainers of the Cuizinart web site. We do not exercise any editorial
                                control over the information you may find at external web site locations. External links
                                are provided for your convenience, and for reasons consistent with our mission.</p>
                        </CardContent>
                    </Card>
                    <Card className={"mt-2 mb-2"}>
                        <CardContent>
                            <h3>Privacy</h3>
                            <p></p>
                            <h5>Data Protection and Privacy Statement</h5>
                            <p>
                                When you access the Cuizinart web site, some of your personal data will be collected and
                                processed by Cuizinart.

                                When you register on our web and agree to their terms of use, access data made available
                                by us, submit a request for a data product or use any other services offered on our web
                                site, you are entering into a service contract with Cuizinart. Cuizinart will collect
                                and process your personal data to process that service contract.
                            </p>
                            <h5>Categories of Data Processed</h5>
                            <p>
                                When accessing our web site, your Internet Protocol (IP) address will be recorded. The
                                IP address is a number that is automatically given to your computer and is used when you
                                are browsing the web on the Internet. Web servers that host web pages automatically
                                identify your computer through its IP number. It is possible to derive users' locations
                                from their IP addresses.

                                Depending on the nature of the services requested, we may collect and process further
                                personal data:

                                When registering on our web, we collect and process your email address and password. If
                                you provide a Globus id, this will also be stored and further processed. If you access
                                our web site as a registered user and send data requests, we will store the contents of
                                these requests. This includes the name, geographical and temporal extent of the product,
                                your user information and time stamps.

                                When accessing data or software made available by us, the only personal data collected
                                and further processed is your email address and Globus id.
                            </p>
                            <h5>Purpose(s) of the Processing</h5>
                            <p>
                                When you access our web site, we may use the personal data collected to perform an
                                analysis of the use of the services and to derive use statistics of all items and
                                services available on the Cuizinart web site in order to improve service performance as
                                well as user relations and experience.

                                In addition, when you register on our web site, access data made available by us, submit
                                a request for a data product or use any other services offered on our web site, we
                                collect and process your personal data to provide you with an ever-improving service
                                experience and the products and services you have requested, including educational
                                resources and online information portals, data, software or hardware tools and support,
                                information updates, events and to promote our services and educational events.

                                The personal data you provide in registration forms will not be used for any other
                                purpose.
                            </p>
                            <h5>Recipients of the Data Processed</h5>
                            <p>
                                For the purpose detailed above, access to your personal data is given to Cuizinart.
                                Where it is necessary in the operation of our services, we may share (or enable access
                                to) your personal data with trusted partners including:

                                service providers or other partners who help us deliver our products and services,
                                perform statistical analysis, manage email or postal mail services or provide user
                                support;
                                other international organisations, including Global Water Futures partner projects.
                            </p>
                            <h5>Security of your personal data</h5>
                            <p>Cuizinart secures your personal data from unauthorised access, use or disclosure. We
                                adopt internationally recognised security best practice standards and techniques to
                                manage the security of your personal information throughout its lifetime, from creation
                                to destruction.

                                Where you create an account to use our online services and software tools, you are
                                responsible for keeping your password confidential. We advise you not to share your
                                password or use a password you commonly use otherwise as the transmission of information
                                over the internet is not guaranteed to be secure.
                            </p>
                            <h5>Right of Access, Rectification, Erasure and Portability</h5>
                            <p>
                                You may ask Cuizinart to access a copy of your personal data, as well as to rectify and
                                erase any such data. If you are a registered user, in order to do either, you can
                                request deletion of your account at any time. Deletion of the account will terminate
                                your service contract with Cuizinart. You have right to request from Cuizinart to export
                                your personal data to a third party. Any such as well as further requests you should
                                address in writing to gwf-cuizinart@uwaterloo.ca.
                            </p>
                            <h5>Data Retention</h5>
                            <p>
                                The information collected and processed when accessing our web will be retained for as
                                long as the service is offered.

                                The information you provide in order to enter into the service contract will be retained
                                for the duration of this contract.

                                Please note that Cuizinart will not be in control of personal data which it legally
                                passed on to other data controllers.
                            </p>
                            <h5>Concerns and Complaints</h5>
                            <p>
                                Cuizinart does not accept any liability with a view to obligations under applicable
                                personally identifiable information legislation for any third-party website which are
                                linked to through the Cuizinart web site. Please refer to the privacy policy governing
                                each of these websites.

                                If you have a concern or complaint about the way that your personal data has been or is
                                being processed, please direct it to gwf-cuizinart@uwaterloo.ca.
                            </p>
                            <h5>Changes to this Data Protection and Privacy Statement</h5>
                            <p>
                                Cuizinart will occasionally update this Data Protection and Privacy Statement to reflect
                                organisational changes and user feedback. We encourage you to periodically review this
                                Data Protection and Privacy Statement to stay informed on how we use and protect your
                                personal information.
                            </p>
                            <h5>OpenStreetMap Map Services</h5>
                            <p>
                                We use map data from OpenStreetMap to display the geographical extent of data products.
                                These maps are requested from the tile.openstreetmap.org web service. This service might
                                store these requests, however these requests will not contain any personal user data.
                            </p>
                            <p><strong>April 25, 2019</strong></p>
                        </CardContent>
                    </Card>
                    <div className={"row justify-content-end m-0"}>
                        <LoaderButton onClick={this.props.agreeDisclaimer} isLoading={this.props.isLoading}
                                      text="Agree" loadingText="Loading…"
                                      style={{display: this.props.hasAgreed ? "none" : ""}}/>
                        <Button onClick={this.props.onClose}>Close</Button>
                    </div>
                </Modal.Body>
            </Modal>

        );
    }
}
