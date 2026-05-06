import ModulePage from '../shared/ModulePage.jsx';

const ProjectDetails = ({ employeeView = false }) => (
  <ModulePage title={employeeView ? 'My Project Details' : 'Project Details'} />
);

export default ProjectDetails;
